import { PackageSearch } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { MarketplaceListingCard } from "@/components/marketplace/MarketplaceListingCard/MarketplaceListingCard";
import type { MarketplaceListingRow } from "@/types/marketplace";
import styles from "./MarketplaceSection.module.css";
import emptyStateStyles from "@/components/events/EventsEmptyState/EventsEmptyState.module.css";

type MarketplaceSectionProps = {
  /** The 4 most recently posted active listings (server-fetched in page.tsx) — real data only, never editor-authored placeholders. */
  listings: MarketplaceListingRow[];
};

/**
 * Homepage teaser for the marketplace — unlike the other movable sections, this one has no
 * editor-authored blob to fall back to (it never existed before), so it's always real-data-driven
 * and always visible (with an empty state when there's nothing posted yet), matching the same
 * "always show a section, never fabricate content" policy applied to the events/businesses
 * teasers.
 */
export function MarketplaceSection({ listings }: MarketplaceSectionProps) {
  return (
    <section id="marketplace" className={styles.section} aria-labelledby="marketplace-heading">
      <SectionHeader id="marketplace-heading">מסירה ומכירה בשכונה</SectionHeader>

      {listings.length === 0 ? (
        <div className={emptyStateStyles.wrap} role="status">
          <PackageSearch size={40} strokeWidth={1.5} aria-hidden="true" className={emptyStateStyles.icon} />
          <h3 className={emptyStateStyles.title}>אין כרגע מודעות להצגה</h3>
          <p className={emptyStateStyles.description}>מודעות חדשות יופיעו כאן לאחר פרסומן.</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {listings.map((listing) => (
              <MarketplaceListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          <div className={styles.showAllWrap}>
            <Button href="/marketplace" variant="secondary">
              לכל הלוח
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
