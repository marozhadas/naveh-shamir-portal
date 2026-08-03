export type BusinessRegistrationStatus = "pending" | "approved" | "rejected";

/** Mirrors the public.business_registrations table (see the "create_business_registrations" migration). */
export type BusinessRegistrationRow = {
  id: string;
  slug: string;
  business_name: string;
  category_id: string;
  description: string;
  short_description: string | null;
  contact_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  website_url: string | null;
  address: string | null;
  service_area: string | null;
  status: BusinessRegistrationStatus;
  featured: boolean;
  verified: boolean;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  /** Set once the owner claims this registration via the magic-link callback (email match) — see /auth/callback. Null until then. */
  owner_id: string | null;
  /** Which /business/plans tier the registrant chose (see the "add_plan_tier_to_business_registrations" migration) — defaults to "free" at the DB level. */
  plan_tier: "free" | "plus" | "premium";
  /**
   * Fields collected only by the Plus/Premium wizard (see the "add_plus_registration_fields"
   * migration) — always null for a "free" registration, which never sets them.
   */
  category_ids: string[] | null;
  business_type: string | null;
  public_phone: string | null;
  public_whatsapp: string | null;
  public_email: string | null;
  address_type: "physical" | "service-area" | "both" | null;
  cover_image: { url: string; alt: string } | null;
  gallery: { url: string; alt: string; order: number }[] | null;
  services: { title: string; description?: string; priceLabel?: string }[] | null;
  opening_hours:
    | {
        day: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
        closed: boolean;
        intervals: { opensAt: string; closesAt: string }[];
      }[]
    | null;
  social_links: { instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string } | null;
  promotion: { title: string; description?: string; validUntil?: string } | null;
  /** Never flipped by the registration submission itself — only by the (not-yet-built) secure trial-activation flow. See PlusBusinessRegistrationInput's doc comment. */
  trial_status: "not-started" | "active" | "ended";
  publication_consent: boolean;
  terms_accepted: boolean;
  trial_consent: boolean;
};

/** Fields the public registration form is allowed to submit — status/featured/verified are never client-supplied (RLS also enforces this server-side). */
export type BusinessRegistrationInsert = Pick<
  BusinessRegistrationRow,
  | "slug"
  | "business_name"
  | "category_id"
  | "description"
  | "short_description"
  | "contact_name"
  | "phone"
  | "whatsapp_phone"
  | "email"
  | "website_url"
  | "address"
  | "service_area"
>;
