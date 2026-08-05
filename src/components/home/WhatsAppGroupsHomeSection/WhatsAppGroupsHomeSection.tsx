import { MessageCircleOff } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { WhatsAppGroupCard } from "@/components/whatsapp-groups/WhatsAppGroupCard/WhatsAppGroupCard";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";
import styles from "./WhatsAppGroupsHomeSection.module.css";
import emptyStateStyles from "@/components/events/EventsEmptyState/EventsEmptyState.module.css";

type WhatsAppGroupsHomeSectionProps = {
  /** Up to 4 published groups, featured/priority-first (server-fetched + picked in page.tsx) — real data only. */
  groups: WhatsAppGroupRow[];
};

/** Homepage teaser — same real-data/always-visible/empty-state pattern as EssentialNumbersHomeSection. */
export function WhatsAppGroupsHomeSection({ groups }: WhatsAppGroupsHomeSectionProps) {
  return (
    <section id="whatsapp-groups-teaser" className={styles.section} aria-labelledby="whatsapp-groups-home-heading">
      <SectionHeader id="whatsapp-groups-home-heading">קבוצות WhatsApp שכונתיות</SectionHeader>

      {groups.length === 0 ? (
        <div className={emptyStateStyles.wrap} role="status">
          <MessageCircleOff size={40} strokeWidth={1.5} aria-hidden="true" className={emptyStateStyles.icon} />
          <h3 className={emptyStateStyles.title}>אין כרגע קבוצות WhatsApp להצגה</h3>
          <p className={emptyStateStyles.description}>קבוצות שכונתיות חדשות יתווספו כאן בקרוב.</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {groups.map((group) => (
              <WhatsAppGroupCard key={group.id} group={group} />
            ))}
          </div>
          <div className={styles.showAllWrap}>
            <Button href="/essential-numbers#whatsapp-groups" variant="secondary">
              לכל הקבוצות
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
