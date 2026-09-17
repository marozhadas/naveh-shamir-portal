"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BusinessReviewsCarousel } from "@/components/business-profile/BusinessReviewsCarousel/BusinessReviewsCarousel";
import { WriteReviewForm } from "@/components/business-profile/WriteReviewForm/WriteReviewForm";
import type { BusinessReviewRow } from "@/types/business-review";
import styles from "./BusinessReviewsSection.module.css";

type BusinessReviewsSectionProps = {
  businessId: string;
  reviews: BusinessReviewRow[];
};

/** Only ever rendered when access.canShowReviews is true (Plus/Premium) — Basic never gets this section at all. */
export function BusinessReviewsSection({ businessId, reviews }: BusinessReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className={styles.section} aria-labelledby="reviews-heading">
      <div className={styles.headerRow}>
        <h2 id="reviews-heading" className={styles.heading}>
          מה אומרים על העסק?
        </h2>
        <Button type="button" variant="secondary" size="compact" onClick={() => setShowForm((current) => !current)} aria-expanded={showForm}>
          {showForm ? "סגירת הטופס" : "כתיבת ביקורת"}
        </Button>
      </div>

      <BusinessReviewsCarousel reviews={reviews} />

      {showForm && <WriteReviewForm businessId={businessId} />}
    </section>
  );
}
