import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BUSINESS_PLANS } from "@/data/business-plans";
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
            אפשר להתחיל ברישום חינמי, ולשדרג בכל שלב לעמוד עסק מלא עם יותר חשיפה.
          </p>

          <div className={styles.grid}>
            {BUSINESS_PLANS.map((plan) => (
              <div key={plan.tier} className={`${styles.card} ${plan.highlighted ? styles.highlighted : ""}`}>
                {plan.highlighted && <span className={styles.badge}>הכי פופולרי</span>}
                <h2 className={styles.planName}>{plan.name}</h2>
                <p className={styles.price}>
                  {plan.priceLabel}
                  {plan.billingNote && <span className={styles.billingNote}> {plan.billingNote}</span>}
                </p>
                <p className={styles.planDescription}>{plan.description}</p>
                <ul className={styles.featureList}>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
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
