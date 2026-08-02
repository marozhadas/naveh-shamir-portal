import "server-only";
import { getAdminId } from "@/lib/admin-session";
import { getAdminNotificationPreferences } from "@/lib/admin/preferences";
import { recordEmailAttempt } from "@/lib/admin/notifications";
import { getEmailProvider } from "./get-email-provider";
import { getCategoryLabel } from "@/data/business-categories";
import { getSiteOrigin } from "@/utils/site-origin";

export type RegistrationEmailInput = {
  notificationId: string;
  registrationId: string;
  businessName: string;
  categoryId: string;
  contactName: string;
  createdAt: string;
};

/**
 * Best-effort — never throws. A failure here must not affect the registration that already
 * succeeded before this runs (see the `after()` call site in business/register/actions.ts).
 */
export async function sendRegistrationNotificationEmail(input: RegistrationEmailInput): Promise<void> {
  try {
    const adminId = getAdminId();
    const preferences = await getAdminNotificationPreferences(adminId);

    if (!preferences.emailEnabled || !preferences.notificationTypes.businessRegistration) {
      await recordEmailAttempt(input.notificationId, { status: "skipped" });
      return;
    }
    if (!preferences.emailAddress) {
      await recordEmailAttempt(input.notificationId, {
        status: "skipped",
        error: "לא הוגדרה כתובת מייל להתראות. ניתן להגדיר ב-/admin/settings/notifications.",
      });
      return;
    }

    const provider = getEmailProvider();
    const result = await provider.sendAdminNotificationEmail({
      toEmail: preferences.emailAddress,
      businessName: input.businessName,
      categoryLabel: getCategoryLabel(input.categoryId) ?? input.categoryId,
      contactName: input.contactName,
      createdAt: input.createdAt,
      adminUrl: `${getSiteOrigin()}/admin/businesses/${input.registrationId}`,
    });

    await recordEmailAttempt(input.notificationId, result);
  } catch (err) {
    console.error("[sendRegistrationNotificationEmail] failed", err);
  }
}
