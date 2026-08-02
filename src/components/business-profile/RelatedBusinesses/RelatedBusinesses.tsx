import { BusinessCard } from "@/components/business-archive/BusinessCard/BusinessCard";
import { FALLBACK_BASIC_ACCESS } from "@/domain/get-business-listing-access";
import type { Business } from "@/types/business";
import type { BusinessListingAccess } from "@/types/business-listing-access";
import styles from "./RelatedBusinesses.module.css";

type RelatedBusinessesProps = {
  /** Already filtered to premium-only by the caller (spec section 13) — this component doesn't re-check access, it just renders. */
  businesses: Business[];
  accessByBusinessId: Record<string, BusinessListingAccess>;
};

/** Reuses the existing archive BusinessCard (spec section 29: "use the existing business card") — no second card component here. */
export function RelatedBusinesses({ businesses, accessByBusinessId }: RelatedBusinessesProps) {
  if (businesses.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="related-heading">
      <h2 id="related-heading" className={styles.heading}>
        עסקים דומים
      </h2>
      <div className={styles.grid}>
        {businesses.map((business) => (
          <BusinessCard key={business.id} business={business} access={accessByBusinessId[business.id] ?? FALLBACK_BASIC_ACCESS} variant="related" />
        ))}
      </div>
    </section>
  );
}
