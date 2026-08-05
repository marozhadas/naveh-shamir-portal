"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import type { ContactMessageSubjectType } from "@/types/contact-message";
import { contactFormSchema, EMPTY_CONTACT_FORM_VALUES, type ContactFormValues } from "./schema";

export type ContactFormActionState = {
  status: "idle" | "validation-error" | "server-error" | "rate-limited" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof ContactFormValues, string[]>>;
  values: ContactFormValues;
};

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשלוח את הפנייה כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";
const RATE_LIMIT_MESSAGE = "כבר קיבלנו פנייה ממך לאחרונה. אפשר לנסות שוב בעוד כמה דקות.";
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000;

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData): ContactFormValues {
  return {
    fullName: readField(formData, "fullName"),
    email: readField(formData, "email"),
    whatsapp: readField(formData, "whatsapp"),
    subjectType: readField(formData, "subjectType"),
    subject: readField(formData, "subject"),
    message: readField(formData, "message"),
    consentAccepted: formData.get("consentAccepted") === "on",
    honeypot: readField(formData, "honeypot"),
  };
}

/**
 * Best-effort throttle: same email address submitting again within RATE_LIMIT_WINDOW_MS is
 * rejected. Reads via the admin (service-role) client — the anon role has no SELECT policy on
 * this table at all, so this check can only run server-side with elevated access; the result
 * is never exposed to the browser. If admin access isn't configured (local dev without the
 * service-role key), the check is skipped rather than blocking submissions outright.
 */
async function isRateLimited(email: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const supabase = createAdminSupabaseClient();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from("contact_messages")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if (error) {
    console.error("[submitContactMessageAction] rate-limit check failed:", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

/**
 * Public, unauthenticated action — the only way a contact message can ever be created (RLS grants
 * anon INSERT only, nothing else). Honeypot fill silently reports success without ever touching the
 * database, so a bot has no signal it was blocked. On any real failure, the submitted values are
 * always returned so the client never has to guess-and-refill (see ContactForm.tsx).
 */
export async function submitContactMessageAction(_prevState: ContactFormActionState, formData: FormData): Promise<ContactFormActionState> {
  const raw = readFormValues(formData);

  if (raw.honeypot) {
    return { status: "success", values: EMPTY_CONTACT_FORM_VALUES };
  }

  const result = contactFormSchema.safeParse(raw);
  if (!result.success) {
    return {
      status: "validation-error",
      message: "יש כמה פרטים שצריך לתקן",
      fieldErrors: result.error.flatten().fieldErrors,
      values: raw,
    };
  }

  const values = result.data;

  if (await isRateLimited(values.email)) {
    return { status: "rate-limited", message: RATE_LIMIT_MESSAGE, values: raw };
  }

  const supabase = createPublicSupabaseClient();
  const { error } = await supabase.from("contact_messages").insert({
    full_name: values.fullName,
    email: values.email,
    whatsapp: values.whatsapp || null,
    subject_type: values.subjectType as ContactMessageSubjectType,
    subject: values.subject,
    message: values.message,
    consent_accepted: values.consentAccepted,
    status: "new",
  });

  if (error) {
    // Technical detail stays server-side only — never surfaced to the visitor.
    console.error("[submitContactMessageAction] insert failed:", error.code, error.message);
    return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
  }

  return { status: "success", values: EMPTY_CONTACT_FORM_VALUES };
}
