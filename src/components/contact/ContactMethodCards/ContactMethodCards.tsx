import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { CONTACT_INFO } from "@/data/config";
import styles from "./ContactMethodCards.module.css";

/**
 * The site's own two contact channels (WhatsApp + email) — deliberately no phone-call option
 * anywhere on this page, per spec. Both links carry data-analytics-event so the shared
 * AnalyticsClickTracker (mounted once in the root layout) records the click.
 */
export function ContactMethodCards() {
  return (
    <div className={styles.cards}>
      <div className={styles.card}>
        <div className={`${styles.iconWrap} ${styles.whatsappIconWrap}`}>
          <WhatsAppIcon size={24} aria-hidden="true" />
        </div>
        <h2 className={styles.title}>פנייה ב־WhatsApp</h2>
        <p className={styles.description}>הדרך המהירה לשלוח הודעה.</p>
        <p className={styles.value} dir="ltr">
          {CONTACT_INFO.whatsappDisplay}
        </p>
        <Button
          href={CONTACT_INFO.whatsappUrl}
          variant="whatsapp"
          fullWidth
          target="_blank"
          rel="noopener noreferrer"
          icon={<WhatsAppIcon size={18} aria-hidden="true" />}
          data-analytics-event="contact-whatsapp-click"
        >
          שליחת הודעה ב־WhatsApp
        </Button>
      </div>

      <div className={styles.card}>
        <div className={`${styles.iconWrap} ${styles.emailIconWrap}`}>
          <Mail size={24} aria-hidden="true" />
        </div>
        <h2 className={styles.title}>פנייה במייל</h2>
        <p className={styles.description}>מתאים לפנייה מפורטת או לשליחת מסמכים.</p>
        <p className={styles.value} dir="ltr">
          {CONTACT_INFO.email}
        </p>
        <Button href={CONTACT_INFO.emailUrl} variant="secondary" fullWidth icon={<Mail size={18} aria-hidden="true" />} data-analytics-event="contact-email-click">
          שליחת מייל
        </Button>
      </div>
    </div>
  );
}
