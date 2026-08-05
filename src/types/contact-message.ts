export type ContactMessageStatus = "new" | "in-progress" | "closed" | "spam";

export const CONTACT_MESSAGE_STATUS_OPTIONS: ContactMessageStatus[] = ["new", "in-progress", "closed", "spam"];

export const CONTACT_MESSAGE_STATUS_LABEL: Record<ContactMessageStatus, string> = {
  new: "חדש",
  "in-progress": "בטיפול",
  closed: "נסגר",
  spam: "ספאם",
};

export type ContactMessageSubjectType =
  | "general"
  | "bug"
  | "content-update"
  | "business"
  | "event"
  | "marketplace"
  | "essential-number"
  | "collaboration"
  | "other";

export const CONTACT_MESSAGE_SUBJECT_TYPE_OPTIONS: ContactMessageSubjectType[] = [
  "general",
  "bug",
  "content-update",
  "business",
  "event",
  "marketplace",
  "essential-number",
  "collaboration",
  "other",
];

export const CONTACT_MESSAGE_SUBJECT_TYPE_LABEL: Record<ContactMessageSubjectType, string> = {
  general: "שאלה כללית",
  bug: "תקלה באתר",
  "content-update": "עדכון תוכן",
  business: "פנייה בנושא עסק",
  event: "פנייה בנושא אירוע",
  marketplace: "פנייה בנושא מודעה",
  "essential-number": "פנייה בנושא מספר חיוני",
  collaboration: "שיתוף פעולה",
  other: "אחר",
};

/** Mirrors the public.contact_messages table (see the create_contact_messages_table migration). */
export type ContactMessageRow = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  subject_type: ContactMessageSubjectType;
  subject: string;
  message: string;
  consent_accepted: boolean;
  status: ContactMessageStatus;
  created_at: string;
  updated_at: string;
};
