import type { BusinessService } from "@/types/business";
import styles from "./BusinessServices.module.css";

type BusinessServicesProps = {
  services: BusinessService[];
};

export function BusinessServices({ services }: BusinessServicesProps) {
  const visible = services.filter((service) => service.visible).sort((a, b) => a.order - b.order);
  if (visible.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="services-heading">
      <h2 id="services-heading" className={styles.heading}>
        שירותים
      </h2>
      <ul className={styles.grid}>
        {visible.map((service) => (
          <li key={service.id} className={styles.card}>
            <span className={styles.name}>{service.name}</span>
            {service.description && <span className={styles.description}>{service.description}</span>}
            {service.priceLabel && <span className={styles.price}>{service.priceLabel}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
