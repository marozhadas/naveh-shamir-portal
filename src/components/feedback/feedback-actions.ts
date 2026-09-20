"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { sanitizeEditorText } from "@/editor/utils/sanitize-editor-content";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";
import { FEEDBACK_KIND_LABEL, feedbackSchema, normalizePagePath } from "./feedback-schema";

export type FeedbackState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string[]> };

const GENERIC_ERROR_MESSAGE = "לא הצלחנו לשלוח את המשוב כרגע. אפשר לנסות שוב בעוד רגע.";
const ANONYMOUS_NAME = "אנונימי";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Stored in the existing contact_messages table (subject_type "feedback") so it shows up in
 * /admin/contact and the admin bell with no parallel system. Public, unauthenticated: RLS lets anon
 * INSERT only. A filled honeypot returns a fake success without writing anything.
 */
export async function submitFeedbackAction(_prevState: FeedbackState, formData: FormData): Promise<FeedbackState> {
  if (readField(formData, "website")) return { status: "success" };

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`feedback-submit:${ip}`, 5, 3600);
  if (!allowed) return { status: "error", message: "נשלחו יותר מדי משובים מהכתובת הזו. אפשר לנסות שוב מאוחר יותר." };

  const result = feedbackSchema.safeParse({
    kind: readField(formData, "kind"),
    message: readField(formData, "message"),
    name: readField(formData, "name"),
    email: readField(formData, "email"),
  });
  if (!result.success) {
    return { status: "error", message: "יש לתקן את השדות המסומנים", fieldErrors: result.error.flatten().fieldErrors };
  }

  const { kind, message, name, email } = result.data;
  const supabase = createPublicSupabaseClient();
  const { error } = await supabase.from("contact_messages").insert({
    full_name: sanitizeEditorText(name) || ANONYMOUS_NAME,
    email: email,
    whatsapp: null,
    subject_type: "feedback",
    subject: `משוב — ${FEEDBACK_KIND_LABEL[kind]}`,
    message: sanitizeEditorText(message),
    // The table's RLS requires consent_accepted = true; the form states the feedback is passed to the portal team.
    consent_accepted: true,
    page_path: normalizePagePath(readField(formData, "pagePath")),
  });

  if (error) {
    console.error("[submitFeedbackAction] insert failed:", error.code, error.message);
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  return { status: "success" };
}
