import { Lock, ShieldCheck } from "lucide-react";
import styles from "./PaymentMethodTrialForm.module.css";

/**
 * "Secure payment" reassurance under the card fields: what is TRUE of this page (HTTPS, card typed inside PayMe's own secure
 * form) plus the usual card-brand marks. The marks are simple generic badges, not official logo files.
 * Confirm with PayMe which cards the account accepts and drop any brand that is not accepted.
 */
export function CardTrustBadges({ providerName = "PayMe" }: { providerName?: string } = {}) {
  return (
    <div className={styles.trust}>
      <ul className={styles.trustList} aria-label="אבטחת התשלום">
        <li className={styles.trustItem}>
          <Lock size={15} aria-hidden="true" />
          חיבור מאובטח (SSL)
        </li>
        <li className={styles.trustItem}>
          <ShieldCheck size={15} aria-hidden="true" />
          סליקה מאובטחת באמצעות {providerName}
        </li>
      </ul>

      <ul className={styles.brands} aria-label="כרטיסי אשראי">
        <li>
          <svg role="img" aria-label="Visa" viewBox="0 0 48 30" className={styles.brand}>
            <rect x="0.5" y="0.5" width="47" height="29" rx="4" fill="#fff" stroke="#d6dde6" />
            <text x="24" y="20" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fontWeight="800" fontStyle="italic" fill="#1a1f71">
              VISA
            </text>
          </svg>
        </li>
        <li>
          <svg role="img" aria-label="Mastercard" viewBox="0 0 48 30" className={styles.brand}>
            <rect x="0.5" y="0.5" width="47" height="29" rx="4" fill="#fff" stroke="#d6dde6" />
            <circle cx="19" cy="15" r="8" fill="#eb001b" />
            <circle cx="29" cy="15" r="8" fill="#f79e1b" />
            <path d="M24 8.8a8 8 0 0 1 0 12.4a8 8 0 0 1 0-12.4z" fill="#ff5f00" />
          </svg>
        </li>
        <li>
          <svg role="img" aria-label="ישראכרט" viewBox="0 0 48 30" className={styles.brand}>
            <rect x="0.5" y="0.5" width="47" height="29" rx="4" fill="#fff" stroke="#d6dde6" />
            <text x="24" y="19" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="9.5" fontWeight="700" fill="#0b3b8c">
              ישראכרט
            </text>
          </svg>
        </li>
        <li>
          <svg role="img" aria-label="American Express" viewBox="0 0 48 30" className={styles.brand}>
            <rect x="0.5" y="0.5" width="47" height="29" rx="4" fill="#2e77bc" stroke="#2e77bc" />
            <text x="24" y="19" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="9" fontWeight="800" fill="#fff">
              AMEX
            </text>
          </svg>
        </li>
      </ul>
    </div>
  );
}
