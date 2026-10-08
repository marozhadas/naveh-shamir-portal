export type ProfileRole = "admin" | "editor" | "business_owner";

/** Mirrors the public.profiles table (see the create_profiles_table migration). */
export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
  /** Explicit privacy-policy consent given at sign-up — whether, when and which policy version. Rows from before the checkbox existed are false / null. */
  privacy_consent: boolean;
  privacy_consent_at: string | null;
  privacy_policy_version: string | null;
};
