import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * The publishable key is safe to use anywhere (including code that could run client-side) — RLS
 * restricts it to inserting a new registration as "pending" and reading only status=approved
 * rows (see the "create_business_registrations" migration). Nothing sensitive is reachable
 * through this client.
 */
export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
