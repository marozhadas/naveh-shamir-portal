import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * The one place that creates a real (publishable-key, RLS-respecting) Supabase client bound to
 * the current request's auth cookies — used for everything to do with a signed-in business
 * owner's session (sending a magic link, reading who's currently signed in, exchanging the
 * callback code for a session, signing out). Never the service-role key: this client is exactly
 * as privileged as the signed-in user, nothing more.
 *
 * `setAll` is wrapped in try/catch because Server Components get a read-only cookie store (only
 * Server Actions and Route Handlers can actually write cookies) — per Supabase's own Next.js App
 * Router guidance, that failure is safe to swallow there since those code paths never need to
 * persist a refreshed token themselves.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component (read-only cookie store) — safe to ignore here.
        }
      },
    },
  });
}

export type SupabaseSessionUser = { id: string; email: string };

/** Returns the real signed-in business owner (if any) — never a mock/demo identity. */
export async function getSupabaseSessionUser(): Promise<SupabaseSessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  return { id: user.id, email: user.email };
}
