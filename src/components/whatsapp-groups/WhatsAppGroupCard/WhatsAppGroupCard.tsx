import Image from "next/image";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { WHATSAPP_GROUP_ICON_MAP } from "@/data/whatsapp-group-icons";
import { WHATSAPP_GROUP_CATEGORY_LABEL } from "@/types/whatsapp-group";
import { isValidWhatsAppGroupUrl } from "@/utils/validate-whatsapp-group-url";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";
import styles from "./WhatsAppGroupCard.module.css";

type WhatsAppGroupCardProps = {
  group: WhatsAppGroupRow;
};

export function WhatsAppGroupCard({ group }: WhatsAppGroupCardProps) {
  const Icon = group.icon_type === "lucide" ? (WHATSAPP_GROUP_ICON_MAP[group.icon_name ?? ""] ?? null) : null;
  // Belt-and-suspenders: the admin form already validates this, but a stored link is never trusted
  // blindly on the public page either — an invalid/missing link means no join button renders at all.
  const canJoin = isValidWhatsAppGroupUrl(group.invite_url);

  return (
    <Card className={styles.card} data-testid="whatsapp-group-card">
      <div className={styles.content}>
        <div className={styles.top}>
          <div className={styles.iconWrap} aria-hidden="true">
            {group.icon_type === "custom-image" && group.icon_url ? (
              <Image src={group.icon_url} alt="" fill sizes="48px" className={styles.iconImage} />
            ) : group.icon_type === "lucide" && Icon ? (
              <Icon size={22} strokeWidth={1.75} />
            ) : (
              <WhatsAppIcon size={26} aria-hidden="true" />
            )}
          </div>
          <div className={styles.headingArea}>
            <h3 className={styles.name}>
              {group.name}
              {group.featured && <span className={styles.featuredBadge}>★ מומלצת</span>}
            </h3>
            <span className={styles.categoryTag}>{WHATSAPP_GROUP_CATEGORY_LABEL[group.category]}</span>
          </div>
        </div>

        {group.description && <p className={styles.description}>{group.description}</p>}

        {group.audience.length > 0 && (
          <p className={styles.meta}>
            <span className={styles.metaLabel}>מיועדת ל:</span> {group.audience.join(", ")}
          </p>
        )}

        {group.area_or_street && (
          <p className={styles.meta}>
            <MapPin size={14} aria-hidden="true" />
            {group.area_or_street}
          </p>
        )}

        {group.rules_or_notes && <p className={styles.notes}>{group.rules_or_notes}</p>}
      </div>

      {canJoin && (
        <Button
          href={group.invite_url}
          variant="whatsapp"
          fullWidth
          target="_blank"
          rel="noopener noreferrer"
          icon={<WhatsAppIcon size={16} aria-hidden="true" />}
          aria-label={`מעבר לקבוצת WhatsApp: ${group.name}`}
          data-analytics-event="whatsapp-group-click"
          data-analytics-category={group.category}
          data-analytics-entity-id={group.id}
        >
          מעבר לקבוצת WhatsApp
        </Button>
      )}
    </Card>
  );
}
