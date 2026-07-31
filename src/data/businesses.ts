import type { Business } from "@/types/business";

/**
 * imageUrl points to generic stock photos matching each business's category
 * (public/images/businesses) — illustrative placeholders, not real photos of
 * these fictional businesses. Swap for real photos once available via API.
 */
export const BUSINESSES: Business[] = [
  {
    id: "1",
    slug: "maafiyat-hapina",
    name: "מאפיית הפינה",
    category: "אוכל",
    description: "לחם מחמצת טרי כל בוקר, עוגות לשבת ומאפים חמים ישר מהתנור.",
    imageUrl: "/images/businesses/bakery.jpg",
    imageAlt: "מדפים עם מגוון לחמים טריים במאפייה",
    phone: "tel:+972500000001",
    whatsappUrl: "https://wa.me/972500000001",
  },
  {
    id: "2",
    slug: "studio-tnua",
    name: "סטודיו תנועה",
    category: "חוגים",
    description: "חוגי פילאטיס ויוגה לכל הגילאים, קבוצות קטנות ואווירה ביתית.",
    imageUrl: "/images/businesses/movement-studio.jpg",
    imageAlt: "חדר בהיר ומרווח לתרגול יוגה ופילאטיס",
    phone: "tel:+972500000002",
    whatsappUrl: "https://wa.me/972500000002",
  },
  {
    id: "3",
    slug: "gemach-klei-avoda",
    name: 'גמ"ח כלי עבודה',
    category: 'גמ"ח',
    description: "השאלת כלי עבודה וציוד לבית לשכונה — בחינם וללא התחייבות.",
    imageUrl: "/images/businesses/gemach-tools.jpg",
    imageAlt: "כלי עבודה ומפתחות שונים תלויים על קיר בסדנה",
    phone: "tel:+972500000003",
    whatsappUrl: "https://wa.me/972500000003",
  },
  {
    id: "4",
    slug: "musach-hashchuna",
    name: "מוסך השכונה",
    category: "שירותים",
    description: "טיפולים ותיקונים לרכב, שירות אמין ומחירים הוגנים לתושבי השכונה.",
    imageUrl: "/images/businesses/garage.jpg",
    imageAlt: "מכונאי בעבודה במוסך רכב",
    phone: "tel:+972500000004",
    whatsappUrl: "https://wa.me/972500000004",
  },
];
