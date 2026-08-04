import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrationById } from "@/lib/admin/business-registrations";
import { BusinessEditForm } from "../BusinessEditForm";
import styles from "../detail.module.css";

export const dynamic = "force-dynamic";

type BusinessEditPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: BusinessEditPageProps): Promise<Metadata> {
  const { id } = await params;
  const registration = await getRegistrationById(id);
  return { title: registration ? `עריכת ${registration.business_name} | ניהול הפורטל` : "עסק | ניהול הפורטל", robots: { index: false, follow: false } };
}

export default async function AdminBusinessEditPage({ params }: BusinessEditPageProps) {
  const { id } = await params;
  const registration = await getRegistrationById(id);
  if (!registration) notFound();

  return (
    <div className={styles.page}>
      <Link href={`/admin/businesses/${registration.id}`} className={styles.back}>
        ← חזרה לעמוד העסק
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>עריכת {registration.business_name}</h1>
          <p className={styles.meta}>עדכון פרטי העסק — סטטוס האישור, החבילה והמנוי מנוהלים בעמוד העסק ולא כאן.</p>
        </div>
      </div>

      <BusinessEditForm registration={registration} />
    </div>
  );
}
