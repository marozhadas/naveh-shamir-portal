import "server-only";
import type { EmailProviderAdapter, SendAdminNotificationEmailParams, SendEmailResult } from "./email-provider";

/**
 * Local/offline stand-in — never sends anything over the network. Used when Supabase isn't
 * configured at all (e.g. a fresh checkout without .env.local set up yet) and directly in unit
 * tests. Production always goes through SupabaseEdgeFunctionEmailProvider instead, which has its
 * own equivalent "demo mode" (see the send-admin-notification-email Edge Function) for when
 * RESEND_API_KEY hasn't been configured as a Supabase secret yet.
 */
export class MockEmailProvider implements EmailProviderAdapter {
  async sendAdminNotificationEmail(params: SendAdminNotificationEmailParams): Promise<SendEmailResult> {
    console.log(
      `[MockEmailProvider] מצב הדגמה — לא נשלח מייל אמיתי אל ${params.toEmail} עבור "${params.businessName}".`,
    );
    return { status: "skipped" };
  }
}
