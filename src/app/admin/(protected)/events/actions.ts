"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { deleteEvent, getEventById, insertEvent, isSlugTaken, setEventStatus, updateEvent } from "@/lib/admin/community-events";
import { deleteEventMediaByUrl, uploadEventMedia } from "@/repositories/event-media-service";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { slugify } from "@/utils/slugify";
import { eventFormSchema, type EventFormValues } from "./schema";
import type { CommunityEventRow, EventStatus } from "@/types/community-event";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
}

function revalidateEventViews(eventId?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  if (eventId) revalidatePath(`/admin/events/${eventId}/edit`);
}

export type EventSaveActionState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof EventFormValues, string[]>>;
  values: EventFormValues;
  savedEvent?: CommunityEventRow;
};

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData): EventFormValues {
  return {
    title: readField(formData, "title"),
    slug: readField(formData, "slug"),
    shortDescription: readField(formData, "shortDescription"),
    fullDescription: readField(formData, "fullDescription"),
    audience: formData.getAll("audience").map(String),
    category: readField(formData, "category"),
    eventDate: readField(formData, "eventDate"),
    startTime: readField(formData, "startTime"),
    endTime: readField(formData, "endTime"),
    locationName: readField(formData, "locationName"),
    address: readField(formData, "address"),
    isFree: formData.get("isFree") === "on",
    priceText: readField(formData, "priceText"),
    registrationUrl: readField(formData, "registrationUrl"),
    contactPhone: readField(formData, "contactPhone"),
    whatsapp: readField(formData, "whatsapp"),
    featured: formData.get("featured") === "on",
    displayOrder: readField(formData, "displayOrder") || "0",
  };
}

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשמור את האירוע כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

/**
 * One action for both create and edit (eventId undefined -> insert, defined -> update), and both
 * "שמירת טיוטה"/"פרסום האירוע" (the submitting button's name="intent" value decides the resulting
 * status). Image handling: imageUrl/imageAlt arrive as plain fields already uploaded via
 * uploadEventImageAction — this action never receives raw file bytes.
 */
export async function saveEventAction(eventId: string | undefined, _prevState: EventSaveActionState, formData: FormData): Promise<EventSaveActionState> {
  const adminId = await requireAdmin();
  const raw = readFormValues(formData);
  const result = eventFormSchema.safeParse(raw);

  if (!result.success) {
    return { status: "validation-error", message: "יש כמה פרטים שצריך לתקן", fieldErrors: result.error.flatten().fieldErrors, values: raw };
  }

  const values = result.data;
  const intent = readField(formData, "intent") === "publish" ? "publish" : "draft";
  const slug = values.slug ? slugify(values.slug) : slugify(values.title);

  if (await isSlugTaken(slug, eventId)) {
    return {
      status: "validation-error",
      message: "יש כמה פרטים שצריך לתקן",
      fieldErrors: { slug: ["ה-Slug הזה כבר בשימוש — יש לבחור אחד ייחודי"] },
      values: raw,
    };
  }

  const imageUrl = readField(formData, "imageUrl");
  const imageAlt = readField(formData, "imageAlt");
  const previousImageUrl = readField(formData, "previousImageUrl");

  const status: EventStatus = intent === "publish" ? "published" : "draft";

  const payload = {
    title: values.title,
    slug,
    short_description: values.shortDescription,
    full_description: values.fullDescription,
    audience: values.audience as CommunityEventRow["audience"],
    category: values.category || null,
    event_date: values.eventDate,
    start_time: values.startTime,
    end_time: values.endTime || null,
    location_name: values.locationName,
    address: values.address || null,
    image_url: imageUrl || null,
    image_alt: imageAlt || null,
    is_free: values.isFree,
    price_text: values.priceText || null,
    registration_url: values.registrationUrl || null,
    contact_phone: values.contactPhone || null,
    whatsapp: values.whatsapp || null,
    status,
    featured: values.featured,
    display_order: Number(values.displayOrder) || 0,
    updated_by: adminId,
    published_at: null,
  };

  try {
    let saved: CommunityEventRow;
    if (eventId) {
      saved = await updateEvent(eventId, { ...payload, published_at: status === "published" ? new Date().toISOString() : undefined });
      await recordAuditLog({ adminId, action: "event-updated", entityType: "event", entityId: eventId, metadata: { title: values.title, status } });
    } else {
      saved = await insertEvent({ ...payload, created_by: adminId, published_at: status === "published" ? new Date().toISOString() : null });
      await recordAuditLog({ adminId, action: "event-created", entityType: "event", entityId: saved.id, metadata: { title: values.title, status } });
    }

    if (previousImageUrl && previousImageUrl !== imageUrl) {
      await deleteEventMediaByUrl(previousImageUrl);
    }

    revalidateEventViews(saved.id);
    return { status: "success", values: raw, savedEvent: saved };
  } catch (error) {
    console.error("[saveEventAction] failed:", error);
    return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
  }
}

export type UploadImageActionResult = { success: true; url: string } | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת תמונות אינה זמינה כרגע.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "התמונה גדולה מדי — עד 5MB.",
  "upload-failed": "העלאת התמונה נכשלה. נסו שוב.",
};

export async function uploadEventImageAction(draftId: string, file: File): Promise<UploadImageActionResult> {
  await requireAdmin();
  const result = await uploadEventMedia(draftId, file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

const STATUS_AUDIT_ACTION: Record<EventStatus, "event-published" | "event-unpublished" | "event-canceled" | "event-updated"> = {
  published: "event-published",
  draft: "event-unpublished",
  canceled: "event-canceled",
  archived: "event-updated",
};

export async function setEventStatusAction(eventId: string, status: EventStatus): Promise<void> {
  const adminId = await requireAdmin();
  const event = await getEventById(eventId);
  if (!event) throw new Error("האירוע לא נמצא.");
  await setEventStatus(eventId, status, adminId);
  await recordAuditLog({ adminId, action: STATUS_AUDIT_ACTION[status], entityType: "event", entityId: eventId, metadata: { title: event.title, status } });
  revalidateEventViews(eventId);
}

export async function deleteEventAction(eventId: string): Promise<void> {
  const adminId = await requireAdmin();
  const event = await getEventById(eventId);
  if (!event) throw new Error("האירוע לא נמצא.");
  if (event.image_url) await deleteEventMediaByUrl(event.image_url);
  await deleteEvent(eventId);
  await recordAuditLog({ adminId, action: "event-deleted", entityType: "event", entityId: eventId, metadata: { title: event.title } });
  revalidateEventViews();
}

export async function duplicateEventAction(eventId: string): Promise<CommunityEventRow> {
  const adminId = await requireAdmin();
  const source = await getEventById(eventId);
  if (!source) throw new Error("האירוע לא נמצא.");

  let slug = slugify(`${source.title}-עותק`);
  let attempt = 0;
  while (await isSlugTaken(slug)) {
    attempt += 1;
    slug = slugify(`${source.title}-עותק`, String(attempt));
  }

  const duplicate = await insertEvent({
    title: `${source.title} (עותק)`,
    slug,
    short_description: source.short_description,
    full_description: source.full_description,
    audience: source.audience,
    category: source.category,
    event_date: source.event_date,
    start_time: source.start_time,
    end_time: source.end_time,
    location_name: source.location_name,
    address: source.address,
    image_url: source.image_url,
    image_alt: source.image_alt,
    is_free: source.is_free,
    price_text: source.price_text,
    registration_url: source.registration_url,
    contact_phone: source.contact_phone,
    whatsapp: source.whatsapp,
    status: "draft",
    featured: false,
    published_at: null,
    created_by: adminId,
    updated_by: adminId,
  });

  await recordAuditLog({ adminId, action: "event-duplicated", entityType: "event", entityId: duplicate.id, metadata: { sourceId: eventId, title: duplicate.title } });
  revalidateEventViews();
  return duplicate;
}
