import { BusinessCard } from "@/components/business-archive/BusinessCard/BusinessCard";
import { FALLBACK_BASIC_ACCESS } from "@/domain/get-business-listing-access";
import type { Business } from "@/types/business";
import type { BusinessListingAccess } from "@/types/business-listing-access";
import styles from "./BusinessesGrid.module.css";

type BusinessesGridProps = {
  businesses: Business[];
  accessByBusinessId: Record<string, BusinessListingAccess>;
};

export function BusinessesGrid({ businesses, accessByBusinessId }: BusinessesGridProps) {
  return (
    <div className={styles.grid}>
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} access={accessByBusinessId[business.id] ?? FALLBACK_BASIC_ACCESS} />
      ))}
    </div>
  );
}
