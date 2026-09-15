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
};
