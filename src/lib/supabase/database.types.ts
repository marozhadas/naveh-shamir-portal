import type { BusinessRegistrationRow } from "@/types/business-registration";

/**
 * Hand-written, minimal Database type (just the one table this app uses) — matches this
 * project's existing convention of typing data by hand rather than pulling in codegen. Extend
 * this if more tables are added later. Shape must satisfy postgrest-js's GenericSchema
 * (Tables/Views/Functions, and each table needs Relationships) even though we don't use views,
 * functions, or foreign-key relationships here.
 */
export type Database = {
  public: {
    Tables: {
      business_registrations: {
        Row: BusinessRegistrationRow;
        Insert: Omit<BusinessRegistrationRow, "id" | "status" | "featured" | "verified" | "created_at" | "reviewed_at"> & {
          status?: BusinessRegistrationRow["status"];
          featured?: boolean;
          verified?: boolean;
        };
        Update: Partial<BusinessRegistrationRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
