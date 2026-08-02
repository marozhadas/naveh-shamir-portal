import type { BusinessRegistrationRow } from "@/types/business-registration";
import type {
  AdminAuditLogRow,
  AdminNotificationPreferencesRow,
  AdminNotificationRow,
} from "@/types/admin-notification";

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
          "id" | "status" | "featured" | "verified" | "created_at" | "reviewed_at" | "rejection_reason"
        > & {
          id?: string;
          status?: BusinessRegistrationRow["status"];
          featured?: boolean;
          verified?: boolean;
          rejection_reason?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
