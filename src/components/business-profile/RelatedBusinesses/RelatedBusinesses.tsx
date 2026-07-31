import { BusinessCard } from "@/components/business-archive/BusinessCard/BusinessCard";
import type { Business } from "@/types/business";
import styles from "./RelatedBusinesses.module.css";

type RelatedBusinessesProps = {
  businesses: Business[];
};

/** Reuses the existing archive BusinessCard (spec section 29: "use the existing business card") — no second card component here. */
export function RelatedBusinesses({ businesses }: RelatedBusinessesProps) {
  if (businesses.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="related-heading">
      <h2 id="related-heading" className={styles.heading}>
        עסקים דומים
      </h2>
      <div className={styles.grid}>
        {businesses.map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>
    </section>
  );
}
