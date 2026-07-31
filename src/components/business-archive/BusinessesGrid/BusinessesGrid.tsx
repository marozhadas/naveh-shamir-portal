import { BusinessCard } from "@/components/business-archive/BusinessCard/BusinessCard";
import type { Business } from "@/types/business";
import styles from "./BusinessesGrid.module.css";

type BusinessesGridProps = {
  businesses: Business[];
};

export function BusinessesGrid({ businesses }: BusinessesGridProps) {
  return (
    <div className={styles.grid}>
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  );
}
