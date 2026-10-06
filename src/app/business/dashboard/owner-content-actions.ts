"use server";

import { revalidatePath } from "next/cache";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { getSubscriptionAccess } from "@/domain/get-subscription-access";
import { getBusinessSelfEditAccess, type BusinessSelfEditAccess } from "@/domain/get-business-self-edit-access";
import { getOwnedRegistrationRow, updateOwnedBusinessContent } from "@/repositories/business-management-service";
import { deleteBusinessMediaByUrl, uploadBusinessMedia } from "@/repositories/business-media-service";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { businessManagementEditSchema, type BusinessManagementEditValues } from "@/app/business/manage/[token]/schema";
import { collectBusinessImageUrls, isOwnedBusinessMediaUrl } from "@/utils/business-media-url";
import { isSupabaseBusinessId, toRegistrationId } from "@/utils/business-id";
import { mapRegistrationToBusiness } from "@/utils/map-registration-to-business";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import type { SubscriptionAccess } from "@/types/subscription";

const SELF_EDIT_BLOCKED_MESSAGE: Record<Extract<BusinessSelfEditAccess, { eligible: false }>["reason"], string> = {
  "plan-not-eligible": "עדכון עצמאי של פרטי העסק זמין למנויי Plus ו-Premium בלבד.",
  "no-subscription": "לא נמצא מנוי פעיל לעסק זה. פנו לתמיכה אם זה לא צפוי.",
  "subscription-not-editable": "המנוי אינו פעיל כרגע, ולכן לא ניתן לערוך את פרטי העסק.",
  "already-edited-this-month": "כבר השתמשת באפשרות העריכה שלך לחודש הזה. ניתן יהיה לערוך שוב בחודש הבא.",
};

const GENERIC_ERROR = "לא הצלחנו לשמור את העדכון כרגע. נסו שוב בעוד רגע.";
const SAVE_RATE_LIMIT_MAX = 20;
const UPLOAD_RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 600;

type OwnerContext =
  | { ok: false; message: string }
  | {
      ok: true;
      userId: string;
      registrationId: string;
      row: BusinessRegistrationRow;
      subscriptionAccess: SubscriptionAccess | null;
      selfEditAccess: BusinessSelfEditAccess;
    };

/**
 * Resolves "which business may this signed-in owner edit, and may they right now" entirely
 * server-side. The business id is NEVER taken from the client — it comes from the session user's
 * owned ids, and the row is re-read with an owner_id filter, so there is no input an attacker
 * could change to target another business (no IDOR surface).
 */
async function resolveOwnerContext(): Promise<OwnerContext> {
  const user = await authAdapter.getCurrentUser();
  if (!user) return { ok: false, message: "יש להתחבר כדי לערוך את העסק." };

  const businessId = user.ownedBusinessIds[0];
  if (!businessId || !isSupabaseBusinessId(businessId)) return { ok: false, message: "לא נמצא עסק המשויך לחשבון זה." };

  const registrationId = toRegistrationId(businessId);
  const row = await getOwnedRegistrationRow(registrationId, user.id);
  if (!row) return { ok: false, message: "העסק לא נמצא או שאינו בבעלותך." };

  const business = mapRegistrationToBusiness(row);
  const subscription = await subscriptionRepository.getByBusinessId(businessId);
  const subscriptionAccess = subscription ? getSubscriptionAccess(subscription, new Date()) : null;
  const selfEditAccess = getBusinessSelfEditAccess({
    activePlanId: business.activePlanId ?? "basic",
    subscriptionAccess,
    lastSelfEditAt: business.lastSelfEditAt ?? null,
    now: new Date(),
  });

  return { ok: true, userId: user.id, registrationId, row, subscriptionAccess, selfEditAccess };
}

export type SaveOwnerContentState =
  /** `locked`: Plus — the one monthly edit is now used, so the form locks until `nextEligibleAt`. */
  | { status: "success"; locked: boolean; nextEligibleAt?: string }
  | { status: "validation-error"; message: string; fieldErrors: Record<string, string[]> }
  | { status: "error"; message: string };

/**
 * Saves the full owner-editable content set. Entering the page and previewing never call this —
 * only a successful save here stamps last_self_edit_at (inside the same UPDATE as the content, see
 * updateOwnedBusinessContent), which is what consumes a Plus owner's monthly edit; Premium is
 * never blocked by it (getBusinessSelfEditAccess).
 */
export async function saveOwnerBusinessContentAction(values: BusinessManagementEditValues): Promise<SaveOwnerContentState> {
  const context = await resolveOwnerContext();
  if (!context.ok) return { status: "error", message: context.message };
  if (!context.selfEditAccess.eligible) return { status: "error", message: SELF_EDIT_BLOCKED_MESSAGE[context.selfEditAccess.reason] };

  if (!(await checkRateLimit(`owner-content-save:${context.userId}`, SAVE_RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS))) {
    return { status: "error", message: "בוצעו יותר מדי ניסיונות שמירה. נסו שוב בעוד כמה דקות." };
  }

  const parsed = businessManagementEditSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "validation-error", message: "יש כמה פרטים שצריך לתקן", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Images may only point into THIS business's own Storage folder (or be an image it already
  // had) — never an external URL or another business's file.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const previousUrls = new Set(
    collectBusinessImageUrls({
      coverImage: context.row.cover_image ?? { url: "" },
      gallery: context.row.gallery ?? [],
      testimonials: context.row.testimonials ?? [],
    }),
  );
  const submittedUrls = collectBusinessImageUrls(parsed.data);
  const foreign = submittedUrls.find((url) => !previousUrls.has(url) && !isOwnedBusinessMediaUrl(url, supabaseUrl, context.registrationId));
  if (foreign) {
    return {
      status: "validation-error",
      message: "אחת התמונות אינה תקינה. יש להעלות את התמונה מחדש.",
      fieldErrors: { coverImage: ["אחת התמונות אינה תקינה"] },
    };
  }

  const updated = await updateOwnedBusinessContent(context.registrationId, context.userId, parsed.data);
  if (!updated) return { status: "error", message: GENERIC_ERROR };

  // Best-effort cleanup AFTER the save succeeded: files this save dropped from the page.
  const submitted = new Set(submittedUrls);
  for (const url of previousUrls) {
    if (!submitted.has(url) && isOwnedBusinessMediaUrl(url, supabaseUrl, context.registrationId)) void deleteBusinessMediaByUrl(url);
  }

  try {
    await recordAuditLog({
      adminId: null,
      action: "business-owner-dashboard-edit",
      entityType: "business-registration",
      entityId: updated.id,
      metadata: { source: "dashboard", businessName: updated.business_name },
    });
  } catch (error) {
    console.error("[saveOwnerBusinessContentAction] audit log failed:", error);
  }

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${updated.slug}`);
  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/preview");
  // Deliberately NOT /business/dashboard/profile: re-rendering it here would swap the editor for
  // the "already edited this month" notice (Plus) and wipe the save confirmation the owner is
  // reading. That page is dynamic, so the next visit reads fresh data anyway.

  // Same gate again with the freshly stamped last_self_edit_at: for Plus this now says
  // "already edited this month" (lock the form), for Premium it stays eligible.
  const after = getBusinessSelfEditAccess({
    activePlanId: mapRegistrationToBusiness(updated).activePlanId ?? "basic",
    subscriptionAccess: context.subscriptionAccess,
    lastSelfEditAt: updated.last_self_edit_at,
    now: new Date(),
  });
  return after.eligible ? { status: "success", locked: false } : { status: "success", locked: true, nextEligibleAt: after.nextEligibleAt };
}

export type UploadOwnerMediaState = { success: true; url: string } | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת תמונות אינה זמינה כרגע. נסו שוב מאוחר יותר.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "התמונה גדולה מדי — עד 5MB לתמונה.",
  "upload-failed": "העלאת התמונה נכשלה. נסו שוב.",
};

/** Upload only — consumes nothing; the monthly edit is spent solely by a successful save. The destination folder comes from the session, never from the client. */
export async function uploadOwnerBusinessMediaAction(kind: "cover" | "gallery" | "testimonial", formData: FormData): Promise<UploadOwnerMediaState> {
  if (kind !== "cover" && kind !== "gallery" && kind !== "testimonial") return { success: false, message: "סוג תמונה לא תקין." };

  const context = await resolveOwnerContext();
  if (!context.ok) return { success: false, message: context.message };
  if (!context.selfEditAccess.eligible) return { success: false, message: SELF_EDIT_BLOCKED_MESSAGE[context.selfEditAccess.reason] };

  if (!(await checkRateLimit(`owner-content-upload:${context.userId}`, UPLOAD_RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS))) {
    return { success: false, message: "בוצעו יותר מדי העלאות. נסו שוב בעוד כמה דקות." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "לא נבחר קובץ." };

  const result = await uploadBusinessMedia(context.registrationId, kind, file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

/**
 * Best-effort cleanup for a photo the owner uploaded and then removed/replaced BEFORE saving. It
 * only ever deletes a file that (a) lives in this business's own Storage folder and (b) is not
 * referenced by what is currently saved — so it can never take down an image the public page is
 * showing; images that were already saved are removed by the save itself, after it succeeds.
 */
export async function discardOwnerBusinessMediaAction(url: string): Promise<void> {
  const context = await resolveOwnerContext();
  if (!context.ok) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!isOwnedBusinessMediaUrl(url, supabaseUrl, context.registrationId)) return;

  const savedUrls = collectBusinessImageUrls({
    coverImage: context.row.cover_image ?? { url: "" },
    gallery: context.row.gallery ?? [],
    testimonials: context.row.testimonials ?? [],
  });
  if (savedUrls.includes(url)) return;

  await deleteBusinessMediaByUrl(url);
}
