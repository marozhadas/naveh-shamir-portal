/**
 * The mock "demo viewer" (a cookie that picks one of the hardcoded DEMO_USERS, see
 * src/adapters/mock-auth-adapter.ts) exists only so the dashboard/trial flows can be exercised locally without real
 * accounts. It is never an identity in production: there, only a real Supabase Auth session counts.
 *
 * `nodeEnv` is a parameter only so tests can prove both modes; callers use the default.
 */
export function isDemoModeEnabled(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}
