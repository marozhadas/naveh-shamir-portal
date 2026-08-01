import { Button } from "@/components/ui/Button";
import { BUSINESS_MONTHLY_PLAN } from "@/types/subscription-plan";
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
          30 ימים ללא עלות. לאחר מכן מנוי חודשי.{" "}
          {BUSINESS_MONTHLY_PLAN.priceAmount === null && "פרטי המחיר יוצגו לפני ההצטרפות."}
        </p>
      </div>
      <Button href="/business/register" variant="accent">
        מתחילים חודש חינם
      </Button>
    </section>
  );
}
