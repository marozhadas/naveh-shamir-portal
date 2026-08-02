import { Building2, UserPen, CalendarClock, CreditCard, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminNotificationPriority, AdminNotificationStatus, AdminNotificationType } from "@/types/admin-notification";

export const NOTIFICATION_TYPE_LABEL: Record<AdminNotificationType, string> = {
  "business-registration": "עסק חדש",
  "business-profile-updated": "עדכון פרופיל עסק",
  "subscription-expiring": "מנוי",
  "payment-failed": "תשלום",
  "contact-message": "פנייה",
};

export const NOTIFICATION_TYPE_ICON: Record<AdminNotificationType, LucideIcon> = {
  "business-registration": Building2,
  "business-profile-updated": UserPen,
  "subscription-expiring": CalendarClock,
  "payment-failed": CreditCard,
  "contact-message": MessageSquare,
};

export const NOTIFICATION_STATUS_LABEL: Record<AdminNotificationStatus, string> = {
  open: "פתוחה",
  resolved: "טופלה",
  dismissed: "בוטלה",
};

export const NOTIFICATION_PRIORITY_LABEL: Record<AdminNotificationPriority, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
  urgent: "דחופה",
};
