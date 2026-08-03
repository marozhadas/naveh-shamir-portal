import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { RegisterBusinessForm } from "../RegisterBusinessForm";
import { registerPlusBusinessAction } from "./actions";
import { BUSINESS_PLANS } from "@/data/business-plans";
import styles from "../register.module.css";

export const metadata: Metadata = { title: "הרשמה למסלול Plus | נווה שמיר", robots: { index: false, follow: false } };

const plan = BUSINESS_PLANS.find((item) => item.tier === "plus")!;

export default function RegisterPlusPage() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>הרשמה למסלול {plan.name}</h1>
          <p className={styles.description}>
            עמוד עסק מלא עם תמונות, שירותים ופרטי קשר מורחבים. הפרטים יישלחו לבדיקה של צוות הפורטל — לאחר אישור,
            העסק שלכם יופיע בארכיון העסקים.
          </p>
          <RegisterBusinessForm
            action={registerPlusBusinessAction}
            planIntro={
              <div className={styles.planIntro}>
                <div>
                  <p className={styles.planIntroName}>מסלול {plan.name}</p>
                  <p className={styles.planIntroPrice}>
                    {plan.priceLabel} {plan.billingNote}
                  </p>
                </div>
              </div>
            }
          />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
