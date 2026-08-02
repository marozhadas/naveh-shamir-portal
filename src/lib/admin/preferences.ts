import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { AdminNotificationPreferences, AdminNotificationPreferencesRow } from "@/types/admin-notification";

export const DEFAULT_ADMIN_NOTIFICATION_PREFERENCES: AdminNotificationPreferences = {
  soundEnabled: false,
  emailEnabled: true,
  emailAddress: null,
  notificationTypes: {
    businessRegistration: true,
    businessProfileUpdated: true,
    subscriptionExpiring: true,
    paymentFailed: true,
    contactMessage: true,
  },
};

function rowToPreferences(row: AdminNotificationPreferencesRow): AdminNotificationPreferences {
  return {
    soundEnabled: row.sound_enabled,
    emailEnabled: row.email_enabled,
    emailAddress: row.email_address,
    notificationTypes: {
      businessRegistration: row.business_registration_enabled,
      businessProfileUpdated: row.business_profile_updated_enabled,
      subscriptionExpiring: row.subscription_expiring_enabled,
      paymentFailed: row.payment_failed_enabled,
      contactMessage: row.contact_message_enabled,
    },
  };
}

/** Returns saved preferences, or the defaults if this admin has never saved any yet (no row is created just by reading). */
export async function getAdminNotificationPreferences(adminId: string): Promise<AdminNotificationPreferences> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("admin_notification_preferences").select("*").eq("admin_id", adminId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToPreferences(data) : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES;
}

export async function saveAdminNotificationPreferences(adminId: string, preferences: AdminNotificationPreferences): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("admin_notification_preferences").upsert(
    {
      admin_id: adminId,
      sound_enabled: preferences.soundEnabled,
      email_enabled: preferences.emailEnabled,
      email_address: preferences.emailAddress,
      business_registration_enabled: preferences.notificationTypes.businessRegistration,
      business_profile_updated_enabled: preferences.notificationTypes.businessProfileUpdated,
      subscription_expiring_enabled: preferences.notificationTypes.subscriptionExpiring,
      payment_failed_enabled: preferences.notificationTypes.paymentFailed,
      contact_message_enabled: preferences.notificationTypes.contactMessage,
    },
    { onConflict: "admin_id" },
  );
  if (error) throw new Error(error.message);
}
