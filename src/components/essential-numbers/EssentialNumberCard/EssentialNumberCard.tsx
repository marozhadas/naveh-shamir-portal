import Image from "next/image";
import { Clock, ExternalLink, Phone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { ESSENTIAL_NUMBER_ICON_MAP } from "@/data/essential-number-icons";
import { ICON_TONE_VARS } from "@/utils/essential-number-icon-tone";
import { normalizePhoneForTelLink } from "@/utils/normalize-phone-for-tel-link";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
import { isSafeHref } from "@/utils/validate-href";
import type { EssentialNumberRow } from "@/types/essential-number";
import styles from "./EssentialNumberCard.module.css";

type EssentialNumberCardProps = {
  entry: EssentialNumberRow;
};

function whatsappHref(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return createWhatsappLink(`https://wa.me/${digits}`);
}

export function EssentialNumberCard({ entry }: EssentialNumberCardProps) {
  const Icon = entry.icon_type === "lucide" ? (ESSENTIAL_NUMBER_ICON_MAP[entry.icon_name ?? ""] ?? Phone) : null;
  const tone = ICON_TONE_VARS[entry.icon_tone];
  const telHref = `tel:${normalizePhoneForTelLink(entry.phone)}`;
  const waHref = entry.whatsapp ? whatsappHref(entry.whatsapp) : "";
  const isEmergency = entry.category === "emergency";

  return (
    <Card className={`${styles.card} ${isEmergency ? styles.emergency : ""}`} data-testid="essential-number-card">
      <div className={styles.top}>
        <div className={styles.iconWrap} style={{ background: tone.bg, color: tone.fg }} aria-hidden="true">
          {entry.icon_type === "custom-image" && entry.icon_url ? (
            <Image src={entry.icon_url} alt="" fill sizes="48px" className={styles.iconImage} />
          ) : (
            Icon && <Icon size={24} strokeWidth={1.75} />
          )}
        </div>
        <div className={styles.headingArea}>
          <h3 className={styles.name}>
            {entry.name}
            {isEmergency && <span className={styles.emergencyBadge}>חירום</span>}
          </h3>
          {entry.description && <p className={styles.description}>{entry.description}</p>}
        </div>
      </div>

      <a href={telHref} className={styles.phoneLink} aria-label={`התקשרות אל ${entry.name} במספר ${entry.display_phone}`}>
        {entry.display_phone}
      </a>

      {entry.opening_hours && (
        <p className={styles.meta}>
          <Clock size={14} aria-hidden="true" />
          {entry.opening_hours}
        </p>
      )}

      {entry.notes && <p className={styles.notes}>{entry.notes}</p>}

      <div className={styles.actions}>
        <Button
          href={telHref}
          variant={isEmergency ? "accent" : "secondary"}
          icon={<Phone size={16} aria-hidden="true" />}
          aria-label={`התקשרו עכשיו אל ${entry.name}`}
          data-analytics-event="essential-number-phone-click"
          data-analytics-category={entry.category}
          data-analytics-entity-id={entry.id}
        >
          התקשרו עכשיו
        </Button>
        {waHref && (
          <Button
            href={waHref}
            variant="whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            icon={<WhatsAppIcon size={16} aria-hidden="true" />}
            aria-label={`שליחת הודעה בוואטסאפ אל ${entry.name}`}
            data-analytics-event="essential-number-whatsapp-click"
            data-analytics-category={entry.category}
            data-analytics-entity-id={entry.id}
          >
            שליחת הודעה
          </Button>
        )}
      </div>

      {entry.website_url && isSafeHref(entry.website_url) && (
        <a
          href={entry.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.websiteLink}
          data-analytics-event="essential-number-website-click"
          data-analytics-category={entry.category}
          data-analytics-entity-id={entry.id}
        >
          <ExternalLink size={14} aria-hidden="true" />
          לאתר הרשמי
        </a>
      )}
    </Card>
  );
}
