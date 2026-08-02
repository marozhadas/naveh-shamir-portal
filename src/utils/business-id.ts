/**
 * The single place that defines how a Supabase business_registrations row's raw uuid maps to the
 * app-facing Business.id used everywhere else (disambiguating it from the static mock ids like
 * "d1") — and the reverse. Also doubles as the routing signal the extended repositories use to
 * decide whether a given businessId belongs to the static mock store or to Supabase.
 */
const SUPABASE_ID_PREFIX = "reg-";

export function isSupabaseBusinessId(businessId: string): boolean {
  return businessId.startsWith(SUPABASE_ID_PREFIX);
}

export function toBusinessId(registrationId: string): string {
  return `${SUPABASE_ID_PREFIX}${registrationId}`;
}

/** Only ever call this after isSupabaseBusinessId(businessId) is true. */
export function toRegistrationId(businessId: string): string {
  return businessId.slice(SUPABASE_ID_PREFIX.length);
}
