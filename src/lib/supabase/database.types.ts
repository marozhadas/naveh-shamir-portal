import type { BusinessRegistrationRow } from "@/types/business-registration";
import type {
  AdminAuditLogRow,
  AdminNotificationPreferencesRow,
  AdminNotificationRow,
} from "@/types/admin-notification";
import type { BusinessSubscriptionRow } from "@/types/subscription";
import type { HeroGalleryImageRow } from "@/types/hero-gallery";

export type BusinessEventLogRow = {
  id: string;
  business_registration_id: string | null;
  event_type: "ownership_claimed" | "trial_started" | "trial_expiring_soon" | "trial_expired" | "subscription_activated";
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Written exclusively by notify_expiring_trials() (see the create_business_notifications migration) — the app never inserts these rows directly. */
export type BusinessNotificationRow = {
  id: string;
  business_registration_id: string;
  owner_id: string | null;
  subscription_id: string;
  type: "trial-expiring-7" | "trial-expiring-3" | "trial-expiring-1" | "trial-expired";
  created_at: string;
  read_at: string | null;
};

/**
 * Hand-written, minimal Database type — matches this project's existing convention of typing data
 * by hand rather than pulling in codegen. Extend this if more tables are added later. Shape must
 * satisfy postgrest-js's GenericSchema (Tables/Views/Functions, and each table needs
 * Relationships) even though we don't use views, functions, or foreign-key relationships here.
 */
export type Database = {
  public: {
    Tables: {
      business_registrations: {
        Row: BusinessRegistrationRow;
        Insert: Omit<
          BusinessRegistrationRow,
          "id" | "status" | "featured" | "verified" | "created_at" | "reviewed_at" | "rejection_reason" | "owner_id"
        > & {
          id?: string;
          status?: BusinessRegistrationRow["status"];
          featured?: boolean;
          verified?: boolean;
          rejection_reason?: string | null;
          owner_id?: string | null;
        };
        Update: Partial<BusinessRegistrationRow>;
        Relationships: [];
      };
      admin_notifications: {
        Row: AdminNotificationRow;
        Insert: Omit<AdminNotificationRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<AdminNotificationRow>;
        Relationships: [];
      };
      admin_notification_reads: {
        Row: { notification_id: string; admin_id: string; read_at: string };
        Insert: { notification_id: string; admin_id: string; read_at?: string };
        Update: { notification_id?: string; admin_id?: string; read_at?: string };
        Relationships: [];
      };
      admin_notification_preferences: {
        Row: AdminNotificationPreferencesRow;
        Insert: Omit<AdminNotificationPreferencesRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<AdminNotificationPreferencesRow>;
        Relationships: [];
      };
      admin_audit_log: {
        Row: AdminAuditLogRow;
        Insert: Omit<AdminAuditLogRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<AdminAuditLogRow>;
        Relationships: [];
      };
      business_subscriptions: {
        Row: BusinessSubscriptionRow;
        Insert: Omit<
          BusinessSubscriptionRow,
          "id" | "created_at" | "updated_at" | "current_period_started_at" | "current_period_ends_at" | "canceled_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          current_period_started_at?: string | null;
          current_period_ends_at?: string | null;
          canceled_at?: string | null;
        };
        Update: Partial<BusinessSubscriptionRow>;
        Relationships: [];
      };
      business_events_log: {
        Row: BusinessEventLogRow;
        Insert: Omit<BusinessEventLogRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<BusinessEventLogRow>;
        Relationships: [];
      };
      business_notifications: {
        Row: BusinessNotificationRow;
        Insert: Omit<BusinessNotificationRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<BusinessNotificationRow>;
        Relationships: [];
      };
      hero_gallery_images: {
        Row: HeroGalleryImageRow;
        Insert: Omit<HeroGalleryImageRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<HeroGalleryImageRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      expire_due_trials: {
        Args: Record<string, never>;
        Returns: number;
      };
      notify_expiring_trials: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
};
