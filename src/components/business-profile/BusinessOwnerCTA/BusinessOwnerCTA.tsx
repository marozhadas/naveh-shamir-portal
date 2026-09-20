import { Button } from "@/components/ui/Button";
import { TRIAL_DAYS } from "@/data/subscription-pricing";
import styles from "./BusinessOwnerCTA.module.css";

export function BusinessOwnerCTA() {
  return (
    <section className={styles.banner} aria-labelledby="owner-cta-heading">
      <div>
        <h2 id="owner-cta-heading" className={styles.title}>
          יש לכם עסק בנווה שמיר?
        </h2>
        <p className={styles.description}>
          קבלו עמוד עסק מקצועי בפורטל, הציגו את השירותים שלכם והגיעו ליותר תושבים בשכונה.
        </p>
        <p className={styles.fineprint}>
          {TRIAL_DAYS} ימי ניסיון חינם ב־Plus וב־Premium. מחירי Plus ו־Premium הם מחירי השקה. הפרטים המלאים בעמוד החבילות.
        </p>
      </div>
      <Button href="/business/plans" variant="accent">
        לצפייה בחבילות
      </Button>
    </section>
  );
}
