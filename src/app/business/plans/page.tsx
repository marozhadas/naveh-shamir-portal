import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
import { PlanPriceBlock } from "@/components/pricing/PlanPriceBlock";
import styles from "./plans.module.css";

export const metadata: Metadata = { title: "חבילות לעסקים | נווה שמיר", robots: { index: false, follow: false } };

export default function BusinessPlansPage() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <nav aria-label="פירורי לחם" className={styles.breadcrumbs}>
            <ol className={styles.breadcrumbList}>
              <li>
                <Link href="/">בית</Link>
              </li>
              <li aria-hidden="true" className={styles.separator}>
                /
              </li>
              <li aria-current="page">חבילות לעסקים</li>
            </ol>
          </nav>
          <h1 className={styles.title}>בחרו את החבילה המתאימה לעסק שלכם</h1>
          <p className={styles.description}>
            אפשר להתחיל ברישום חינמי, ולשדרג בכל שלב לעמוד עסק מלא עם יותר חשיפה. מחירי Plus ו־Premium הם מחירי השקה.
          </p>

          <div className={styles.grid}>
            {BUSINESS_PLANS.map((plan) => (
              <div key={plan.tier} className={`${styles.card} ${plan.highlighted ? styles.highlighted : ""}`}>
                {plan.highlighted && <span className={styles.badge}>הכי פופולרי</span>}
                <h2 className={styles.planName}>{plan.name}</h2>
                {plan.pricing ? (
                  <div className={styles.price}>
                    <PlanPriceBlock monthly={plan.pricing.monthly} yearly={plan.pricing.yearly} />
                  </div>
                ) : (
                  <p className={styles.price}>חינם</p>
                )}
                {plan.trialDays && <p className={styles.trialNote}>{plan.trialDays} ימי ניסיון חינם, במסלול החודשי ובמסלול השנתי</p>}
                <p className={styles.planDescription}>{plan.description}</p>
                <ul className={styles.featureList}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {plan.notIncluded.length > 0 && (
                  <ul className={styles.notIncludedList} aria-label="מה לא כלול">
                    {plan.notIncluded.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                <Button href={plan.ctaHref} variant={plan.highlighted ? "accent" : "primary"} fullWidth>
                  {plan.ctaLabel}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
