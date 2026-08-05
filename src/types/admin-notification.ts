export type AdminNotificationType =
  | "business-registration"
  | "business-profile-updated"
  | "subscription-expiring"
  | "payment-failed"
  | "contact-message";

export type AdminNotificationStatus = "open" | "resolved" | "dismissed";

export type AdminNotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationEmailStatus = "pending" | "sent" | "failed" | "skipped";

/** Mirrors the public.admin_notifications table (see the "create_admin_notification_system" migration). */
export type AdminNotificationRow = {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  status: AdminNotificationStatus;
  priority: AdminNotificationPriority;
  action_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  email_status: NotificationEmailStatus;
  email_sent_at: string | null;
  email_error: string | null;
  email_attempts: number;
  last_email_attempt_at: string | null;
};

/** A notification joined with whether the current admin has read it — used everywhere the UI renders a list. */
export type AdminNotificationWithReadState = AdminNotificationRow & { isRead: boolean };

export type AdminNotificationPreferencesRow = {
  admin_id: string;
  sound_enabled: boolean;
  email_enabled: boolean;
  email_address: string | null;
  business_registration_enabled: boolean;
  business_profile_updated_enabled: boolean;
  subscription_expiring_enabled: boolean;
  payment_failed_enabled: boolean;
  contact_message_enabled: boolean;
  created_at: string;
  updated_at: string;
};

/** Client-facing shape used by the settings form — camelCase, grouped notificationTypes (matches the spec). */
export type AdminNotificationPreferences = {
  soundEnabled: boolean;
  emailEnabled: boolean;
  emailAddress: string | null;
  notificationTypes: {
    businessRegistration: boolean;
    businessProfileUpdated: boolean;
    subscriptionExpiring: boolean;
    paymentFailed: boolean;
    contactMessage: boolean;
  };
};

export type AdminAuditLogRow = {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminAuditAction =
  | "admin-login"
  | "admin-logout"
  | "business-approved"
  | "business-rejected"
  | "business-updated"
  | "business-deleted"
  | "notification-preferences-updated"
  | "notification-email-retry"
  | "event-created"
  | "event-updated"
  | "event-published"
  | "event-unpublished"
  | "event-canceled"
  | "event-deleted"
  | "event-duplicated"
  | "essential-number-created"
  | "essential-number-updated"
  | "essential-number-published"
  | "essential-number-unpublished"
  | "essential-number-archived"
  | "essential-number-reordered"
  | "essential-number-duplicated"
  | "essential-number-deleted";
