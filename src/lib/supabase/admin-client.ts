import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Uses the service_role secret — bypasses RLS entirely. Must never be imported by anything that
 * could end up in a client bundle (the `server-only` import above makes that a build error, not
 * just a convention). Only the hidden admin page's Server Actions/Server Components should use
 * this — everything else (including the public registration form) uses the public client.
 */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin access is not configured: set SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) in .env.local.",
    );
  }
  return createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } });
}
