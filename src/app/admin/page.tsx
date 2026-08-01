import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { AdminLoginForm } from "./AdminLoginForm";
import { RegistrationsList } from "./RegistrationsList";
import { adminLogoutAction } from "./actions";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "ניהול הרשמות | נווה שמיר", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <div className={styles.loginWrap}>
        <AdminLoginForm />
      </div>
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.notConfigured}>
          <p className={styles.notConfiguredTitle}>Supabase עדיין לא מוגדר במלואו</p>
          <p>יש להוסיף את SUPABASE_SERVICE_ROLE_KEY בקובץ .env.local כדי לצפות בהרשמות.</p>
        </div>
      </div>
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("business_registrations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>הרשמות עסקים</h1>
        <form action={adminLogoutAction}>
          <Button type="submit" variant="secondary" size="compact" icon={<LogOut size={15} aria-hidden="true" />}>
            יציאה
          </Button>
        </form>
      </div>

      {error ? (
        <p className={styles.empty}>שגיאה בטעינת ההרשמות: {error.message}</p>
      ) : (
        <RegistrationsList registrations={data ?? []} />
      )}
    </div>
  );
}
