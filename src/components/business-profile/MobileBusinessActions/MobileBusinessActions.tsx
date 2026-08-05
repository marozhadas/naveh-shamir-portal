import { MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { createMapLink } from "@/utils/create-map-link";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
import { normalizePhoneForTelLink } from "@/utils/normalize-phone-for-tel-link";
import { getBusinessContact } from "@/utils/business-profile";
import type { Business } from "@/types/business";
import styles from "./MobileBusinessActions.module.css";

type MobileBusinessActionsProps = {
  business: Business;
};

/** Up to 3 actions (spec section 24); renders nothing at all when there's nothing to show, so it never reserves empty space. */
export function MobileBusinessActions({ business }: MobileBusinessActionsProps) {
  const contact = getBusinessContact(business);
  const whatsappLink = contact.whatsappUrl ? createWhatsappLink(contact.whatsappUrl) : "";
  const mapLink = createMapLink(business.location);

  const hasAnyAction = Boolean(whatsappLink || contact.phone || contact.websiteUrl || mapLink);
  if (!hasAnyAction) return null;

  return (
    <div className={styles.bar}>
      {whatsappLink && (
        <Button
          href={whatsappLink}
          variant="whatsapp"
          target="_blank"
          rel="noopener noreferrer"
          icon={<WhatsAppIcon size={16} aria-hidden="true" />}
          fullWidth
          data-analytics-event="business_whatsapp_click"
          data-analytics-business-id={business.id}
          data-analytics-category={business.category}
        >
          וואטסאפ
        </Button>
      )}
      {contact.phone && (
        <Button
          href={`tel:${normalizePhoneForTelLink(contact.phone)}`}
          variant="secondary"
          icon={<Phone size={16} aria-hidden="true" />}
          fullWidth
          data-analytics-event="business_phone_click"
          data-analytics-business-id={business.id}
          data-analytics-category={business.category}
        >
          התקשרו
        </Button>
      )}
      {!contact.phone && mapLink && (
        <Button href={mapLink} variant="secondary" target="_blank" rel="noopener noreferrer" icon={<MapPin size={16} aria-hidden="true" />} fullWidth>
          ניווט
        </Button>
      )}
    </div>
  );
}
