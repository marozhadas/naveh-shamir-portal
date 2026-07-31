import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createMapLink } from "@/utils/create-map-link";
import type { BusinessLocation } from "@/types/business";
import styles from "./BusinessLocationCard.module.css";

type BusinessLocationCardProps = {
  location: BusinessLocation;
};

export function BusinessLocationCard({ location }: BusinessLocationCardProps) {
  const mapLink = createMapLink(location);
  const lines = [location.address, location.city].filter(Boolean);

  if (lines.length === 0 && !location.serviceArea) return null;

  return (
    <section className={styles.section} aria-labelledby="location-heading">
      <h2 id="location-heading" className={styles.heading}>
        כתובת ואזור שירות
      </h2>
      <div className={styles.card}>
        <MapPin size={20} aria-hidden="true" className={styles.icon} />
        <div className={styles.details}>
          {lines.length > 0 && <p className={styles.address}>{lines.join(", ")}</p>}
          {location.serviceArea && <p className={styles.serviceArea}>אזור שירות: {location.serviceArea}</p>}
        </div>
        {mapLink && (
          <Button href={mapLink} variant="secondary" size="compact" target="_blank" rel="noopener noreferrer">
            ניווט
          </Button>
        )}
      </div>
    </section>
  );
}
