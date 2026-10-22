/**
 * The words around the SUMIT card step of the registration (an EXPERIMENT, limited to SUMIT_TEST_EMAILS on the test organization).
 *
 * What the step really does: it SAVES a payment method. It charges nothing, creates no subscription, starts no trial, and the
 * approval of the business does not start one either (that wiring is a later stage). So no text here - and none of the texts that
 * show only while this step is on - may promise that a trial "will start automatically", or when a charge will happen.
 * Client-safe: plain strings, no imports.
 */

export const SAVE_ONLY_SUMMARY = "אמצעי התשלום נשמר בלבד. לא מתבצע חיוב, לא נוצר מנוי ולא מתחילה תקופת ניסיון בשלב זה.";

/** Under the title of the registration page, when step 6 is on. */
export const REGISTRATION_PAGE_DISCLAIMER = "בשלב האחרון (שלב ניסיוני) ניתן לשמור אמצעי תשלום. לא מתבצע חיוב, לא נוצר מנוי ולא מתחילה תקופת ניסיון. העסק ממתין לאישור הצוות.";

/** Step 5 (review), when step 6 follows. */
export const REVIEW_PAYMENT_NOTE = "בשלב הבא ניתן לשמור אמצעי תשלום (שלב ניסיוני). לא מתבצע חיוב עכשיו, לא נוצר מנוי ולא מתחילה תקופת ניסיון. העסק ימשיך להמתין לאישור הצוות.";

/** The consent checkbox of step 5, when step 6 follows. */
export const REVIEW_PAYMENT_CONSENT = "אני מאשר/ת לשמור את אמצעי התשלום. ידוע לי שלא מתבצע חיוב ושלא נוצר מנוי או תקופת ניסיון בשלב זה.";

/** Step 5, when step 6 follows: the billing-track legend, the consent's error text and its label in the error summary (the schema's own texts promise "30 days"). */
export const REVIEW_BILLING_LEGEND = "בחרו מסלול חיוב (שלב ניסיוני: לא מתבצע חיוב ולא מתחילה תקופת ניסיון)";
export const REVIEW_PAYMENT_CONSENT_ERROR = "יש לאשר את שמירת אמצעי התשלום";
export const REVIEW_PAYMENT_CONSENT_LABEL = "אישור שמירת אמצעי התשלום";

/** Step 6, above the form. */
export const STEP6_INTRO = "פרטי העסק נשמרו וההרשמה ממתינה לאישור הצוות. כדי להשלים את שלב אמצעי התשלום (שלב ניסיוני), הזינו כרטיס. לא מתבצע חיוב, לא נוצר מנוי ולא מתחילה תקופת ניסיון.";

/** The card form's own lead and consent. */
export const CARD_FORM_LEAD = `${SAVE_ONLY_SUMMARY} הפעלת תקופת ניסיון וחיוב אינן חלק משלב זה.`;
export const CARD_FORM_CONSENT = "אני מאשר/ת לשמור את אמצעי התשלום. ידוע לי שלא מתבצע חיוב עכשיו ושלא נוצר מנוי או תקופת ניסיון בשלב זה.";
export const CARD_FORM_SECURITY_NOTE = "פרטי הכרטיס נשלחים ישירות לספק הסליקה (SUMIT) ואינם עוברים בשרתי הפורטל. אלינו מגיע רק אסימון חד-פעמי, ונשמרים רק מזהים ומסכת הכרטיס.";
export const CARD_FORM_SUBMIT = "שמירת אמצעי התשלום והשלמת ההרשמה";

/** The notice of a registration that still lacks step 6 (dashboard card, trial page, payment-method page). */
export const RESUME_NOTICE = "נשאר שלב אחד להשלמת ההרשמה: שמירת אמצעי תשלום (שלב ניסיוני). לא יתבצע חיוב, לא ייווצר מנוי ולא תתחיל תקופת ניסיון.";
export const RESUME_TITLE = "נשאר שלב אחד להשלמת ההרשמה: שמירת אמצעי תשלום";

/** The success page after the card was saved. */
export const SUCCESS_PAYMENT_SAVED = "אמצעי התשלום נשמר. לא בוצע חיוב, לא נוצר מנוי ולא התחילה תקופת ניסיון. העסק ממתין לאישור הצוות.";
