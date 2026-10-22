import { getOffer } from "@/data/subscription-offers";

/** What the admin helper returns for a card (a client component imports this file, so it takes no server-only module): provider + mask only. */
export type SavedPaymentMethodView = { hasPaymentMethod: boolean; cardMask: string | null; provider: "payme" | "sumit" | null };

/**
 * What the admin reads under "אמצעי תשלום" on a business. Pure text, from what the admin helper returns (provider + mask only, never
 * a token or a provider id) and the registration's status / offer.
 *
 * A SUMIT card is described as a card kept at SUMIT, with its last four digits, "no charge made", and - while the business is
 * pending - what approving does: it starts the trial (length from the offer on the business) WITHOUT any charge. The automatic
 * billing is not connected yet, so nothing says or implies that the card will be charged.
 */
export type ApprovalActivationView = { hasPaymentMethod: boolean; cardMask: string | null; offerLabel: string; trialDays: number; provider?: "payme" | "sumit" | null };

/** The sentence in the admin's approval dialog about what approving a PAID business does, by where its card is kept. */
export function describeApprovalActivation(activation: ApprovalActivationView): string {
  if (!activation.hasPaymentMethod) return "לעסק אין אמצעי תשלום שמור. אם הסליקה פעילה, האישור יידחה.";
  if (activation.provider === "sumit") {
    const last4 = /([0-9]{4})$/.exec(activation.cardMask ?? "")?.[1];
    return `האישור מפעיל גם את תקופת הניסיון (${activation.offerLabel}, ${activation.trialDays} ימים) ללא חיוב. אמצעי התשלום השמור ב-SUMIT: ${last4 ? `כרטיס שמסתיים ב-${last4}` : "כרטיס שמור"}. החיוב האוטומטי עדיין לא מחובר, ולכן לא יתבצע חיוב גם בסיום הניסיון. ההטבה (רגיל או פיילוט) נעולה מרגע האישור.`;
  }
  return `האישור מפעיל גם את תקופת הניסיון: ייווצר מנוי ב-PayMe (${activation.offerLabel}, ${activation.trialDays} ימים), והחיוב הראשון יתבצע בסיומה. אמצעי התשלום השמור: ${activation.cardMask ?? "כרטיס שמור"}. ההטבה (רגיל או פיילוט) נעולה מרגע האישור.`;
}

export function describeSavedPaymentMethod(method: SavedPaymentMethodView, registrationStatus: string, offerCode: unknown): string {
  if (!method.hasPaymentMethod) return "לא נשמר אמצעי תשלום לעסק הזה.";

  if (method.provider === "sumit") {
    const last4 = /([0-9]{4})$/.exec(method.cardMask ?? "")?.[1];
    const card = last4 ? `כרטיס שמסתיים ב-${last4}` : "כרטיס";
    const trialDays = getOffer(offerCode).trialDays;
    if (registrationStatus === "pending") {
      return `נשמר אמצעי תשלום ב-SUMIT (${card}). לא בוצע חיוב. אישור העסק יתחיל תקופת ניסיון של ${trialDays} ימים ללא חיוב. החיוב האוטומטי עדיין לא מחובר, ולכן לא יתבצע חיוב בסיום הניסיון.`;
    }
    return `נשמר אמצעי תשלום ב-SUMIT (${card}). לא בוצע חיוב. החיוב האוטומטי עדיין לא מחובר.`;
  }

  return `נשמר אמצעי תשלום (${method.cardMask ?? "כרטיס"}). לא בוצע חיוב. הוא ישמש ליצירת המנוי ברגע שתאשרו את העסק.`;
}
