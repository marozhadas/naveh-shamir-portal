import { Button } from "@/components/ui/Button";
import styles from "./ContactCtaSection.module.css";

/** A short, static nudge toward /contact — not editor-controlled (matches MarketplaceSection/EssentialNumbersHomeSection: real, not editor-authored, content). */
export function ContactCtaSection() {
  return (
    <section className={styles.section} aria-labelledby="contact-cta-heading">
      <div className={styles.inner}>
        <p id="contact-cta-heading" className={styles.text}>
          צריכים עזרה או רוצים לעדכן אותנו?
        </p>
        <Button href="/contact" variant="secondary">
          צור קשר
        </Button>
      </div>
    </section>
  );
}
