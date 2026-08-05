import { PhoneOff } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { EssentialNumberCard } from "@/components/essential-numbers/EssentialNumberCard/EssentialNumberCard";
import type { EssentialNumberRow } from "@/types/essential-number";
import styles from "./EssentialNumbersHomeSection.module.css";
import emptyStateStyles from "@/components/events/EventsEmptyState/EventsEmptyState.module.css";

type EssentialNumbersHomeSectionProps = {
  /** Up to 4 published entries, featured/priority-first (server-fetched + picked in page.tsx) — real data only. */
  entries: EssentialNumberRow[];
};

/**
 * Homepage teaser — like MarketplaceSection, this has no editor-authored blob to fall back to and
 * is always real-data-driven and always visible (empty state when nothing's published yet).
 * Source of truth is exclusively the essential_numbers table — never the floating editor's JSON.
 */
export function EssentialNumbersHomeSection({ entries }: EssentialNumbersHomeSectionProps) {
  return (
    <section id="essential-numbers-teaser" className={styles.section} aria-labelledby="essential-numbers-heading">
      <SectionHeader id="essential-numbers-heading">מספרים חיוניים</SectionHeader>

      {entries.length === 0 ? (
        <div className={emptyStateStyles.wrap} role="status">
          <PhoneOff size={40} strokeWidth={1.5} aria-hidden="true" className={emptyStateStyles.icon} />
          <h3 className={emptyStateStyles.title}>אין כרגע מספרים להצגה</h3>
          <p className={emptyStateStyles.description}>מספרים חיוניים יתווספו כאן בקרוב.</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {entries.map((entry) => (
              <EssentialNumberCard key={entry.id} entry={entry} />
            ))}
          </div>
          <div className={styles.showAllWrap}>
            <Button href="/essential-numbers" variant="secondary">
              לכל המספרים החיוניים
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
