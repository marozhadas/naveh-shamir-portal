import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { EmailProviderAdapter, SendAdminNotificationEmailParams, SendEmailResult } from "./email-provider";

/**
 * Invokes the deployed `send-admin-notification-email` Supabase Edge Function using the
 * service-role client (server-only). RESEND_API_KEY is never read here — it lives exclusively as
 * an Edge Function secret inside Supabase, so it never reaches this Next.js app's process env or
 * client bundle. If the function itself has no RESEND_API_KEY configured, it runs in its own demo
 * mode and reports back status "skipped" rather than pretending to have sent anything.
 */
export class SupabaseEdgeFunctionEmailProvider implements EmailProviderAdapter {
  async sendAdminNotificationEmail(params: SendAdminNotificationEmailParams): Promise<SendEmailResult> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.functions.invoke("send-admin-notification-email", { body: params });

    if (error) {
      return { status: "failed", error: error.message };
    }
    const result = data as { ok: boolean; status: "sent" | "failed" | "skipped"; error?: string } | null;
    if (!result) {
      return { status: "failed", error: "Empty response from send-admin-notification-email." };
    }
    return { status: result.status, error: result.error };
  }
}
