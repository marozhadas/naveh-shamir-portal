import type { Business } from "@/types/business";

/**
 * Full-profile enrichment for a handful of demo businesses from BUSINESSES_DIRECTORY (spread on
 * top of the base record by the mock repository — see mock-business-repository.ts). Every
 * business in the directory gets `status: "published"` by default; these five additionally
 * demonstrate the full range of publication/subscription states the spec calls for:
 *
 * - d1  סטודיו נועה     — published, owner "owner-1",  subscription: active
 * - d3  המטבח של רוני    — published, owner "owner-3",  subscription: trialing (~18 days left)
 * - d13 פיקס לבית        — published, owner "owner-13", subscription: canceled (cancelAtPeriodEnd)
 * - d2  מספרת קו הבית    — draft (never published),      owner "owner-2",  no subscription yet
 * - d15 חשמלאי מוסמך     — suspended (trial ended, unpaid), owner "owner-15", subscription: expired
 */
export const BUSINESS_PROFILE_OVERRIDES: Record<string, Partial<Business>> = {
  d1: {
    ownerId: "owner-1",
    status: "published",
    publishedAt: "2026-06-02T00:00:00+03:00",
    updatedAt: "2026-06-20T00:00:00+03:00",
    fullDescription:
      "סטודיו נועה פועל בשכונה כבר שלוש שנים ומתמחה בטיפולי פנים, איפור ועיצוב גבות בסביבה ביתית ונעימה. אנחנו עובדות רק עם מוצרים טבעיים ומקפידות על התאמה אישית לכל לקוחה — בין אם זו הכנה לאירוע או פינוק שגרתי.\n\nניתן לתאם תור דרך וואטסאפ או טלפון, וגם להגיע ללא תור בשעות הפעילות במידה ויש מקום פנוי.",
    image: { src: "", alt: "" },
    gallery: [
      { id: "g1", src: "", alt: "פינת הטיפולים בסטודיו", order: 1 },
      { id: "g2", src: "", alt: "מוצרי טיפוח טבעיים על המדף", order: 2 },
      { id: "g3", src: "", alt: "כיסא הטיפולים ותאורה רכה", order: 3 },
    ],
    contact: { phone: "tel:+972500000101", whatsappUrl: "https://wa.me/972500000101", email: "" },
    location: { neighborhood: "נווה שמיר", address: "רחוב הדקל 4", city: "תל אביב", serviceArea: "נווה שמיר והסביבה" },
    openingHours: [
      { day: "sunday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
      { day: "monday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
      { day: "tuesday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "20:00" }] },
      { day: "wednesday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
      { day: "thursday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "20:00" }] },
      { day: "friday", closed: false, intervals: [{ opensAt: "08:00", closesAt: "13:00" }] },
      { day: "saturday", closed: true, intervals: [] },
    ],
    services: [
      { id: "s1", name: "טיפול פנים קלאסי", description: "ניקוי, פילינג ומסכה מותאמת", priceLabel: "החל מ־120 ₪", visible: true, order: 1 },
      { id: "s2", name: "איפור ערב", description: "כולל ייעוץ קצר לפני האירוע", priceLabel: "בתיאום", visible: true, order: 2 },
      { id: "s3", name: "עיצוב גבות", visible: true, order: 3, priceLabel: "50 ₪" },
    ],
    socialLinks: { instagram: "https://instagram.com/studio.noa.demo" },
    highlights: ["מוצרים טבעיים בלבד", "התאמה אישית לכל לקוחה", "ניתן להגיע ללא תור"],
    promotion: {
      title: "10% הנחה על טיפול ראשון",
      description: "לכל תושבת חדשה בפורטל",
      validUntil: "2026-12-31T00:00:00+03:00",
      ctaLabel: "לתיאום בוואטסאפ",
      ctaUrl: "https://wa.me/972500000101",
      visible: true,
    },
  },

  d3: {
    ownerId: "owner-3",
    status: "published",
    publishedAt: "2026-06-16T00:00:00+03:00",
    updatedAt: "2026-06-16T00:00:00+03:00",
    fullDescription:
      "המטבח של רוני מספק ארוחות שבת מוכנות, קייטרינג לאירועי משפחה קטנים ועוגות לפי הזמנה — הכל מבושל ואפוי טרי בכל שבוע. אנחנו שמות דגש על מרכיבים איכותיים וטעמים ביתיים, בדיוק כמו אצל סבתא.",
    contact: { phone: "tel:+972500000103", whatsappUrl: "https://wa.me/972500000103" },
    location: { neighborhood: "נווה שמיר", address: "רחוב הגפן 9", serviceArea: "נווה שמיר והסביבה" },
    openingHours: [
      { day: "sunday", closed: false, intervals: [{ opensAt: "10:00", closesAt: "16:00" }] },
      { day: "monday", closed: false, intervals: [{ opensAt: "10:00", closesAt: "16:00" }] },
      { day: "tuesday", closed: false, intervals: [{ opensAt: "10:00", closesAt: "16:00" }] },
      { day: "wednesday", closed: false, intervals: [{ opensAt: "10:00", closesAt: "16:00" }] },
      { day: "thursday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "20:00" }] },
      { day: "friday", closed: false, intervals: [{ opensAt: "07:00", closesAt: "13:00" }] },
      { day: "saturday", closed: true, intervals: [] },
    ],
    services: [
      { id: "s1", name: "ארוחת שבת זוגית", priceLabel: "180 ₪", visible: true, order: 1 },
      { id: "s2", name: "ארוחת שבת משפחתית (עד 6 סועדים)", priceLabel: "320 ₪", visible: true, order: 2 },
      { id: "s3", name: "עוגה לפי הזמנה", description: "טעמים וגדלים לבחירה", priceLabel: "לפרטים", visible: true, order: 3 },
    ],
    highlights: ["הזמנה עד יום חמישי בצהריים", "איסוף עצמי או משלוח באזור"],
  },

  d13: {
    ownerId: "owner-13",
    status: "published",
    publishedAt: "2026-06-21T00:00:00+03:00",
    updatedAt: "2026-06-21T00:00:00+03:00",
    fullDescription:
      "פיקס לבית מספק פתרונות תיקון מהירים לכל בעיה ביתית — הרכבת רהיטים, תלייה, איטום, ותיקונים קטנים נוספים. ברוב המקרים ניתן להגיע באותו יום.",
    contact: { phone: "tel:+972500000113", whatsappUrl: "https://wa.me/972500000113" },
    location: { neighborhood: "נווה שמיר", serviceArea: "נווה שמיר" },
    services: [
      { id: "s1", name: "הרכבת רהיטים", priceLabel: "החל מ־80 ₪", visible: true, order: 1 },
      { id: "s2", name: "תלייה על הקיר (תמונות, מדפים)", priceLabel: "החל מ־60 ₪", visible: true, order: 2 },
      { id: "s3", name: "תיקונים כלליים", priceLabel: "בתיאום", visible: true, order: 3 },
    ],
  },

  d2: {
    ownerId: "owner-2",
    status: "draft",
    fullDescription: "טיוטה בעבודה — עדיין לא כל הפרטים מולאו.",
  },

  d15: {
    ownerId: "owner-15",
    status: "suspended",
  },
};
