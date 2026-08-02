import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminConfigError, isAdminAuthenticated } from "@/lib/admin-session";
import { AdminLoginForm } from "./AdminLoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "כניסת מנהל | נווה שמיר", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const configError = getAdminConfigError();
  if (!configError && (await isAdminAuthenticated())) {
    redirect("/admin");
  }

  return (
    <div className={styles.wrap}>
      {configError ? (
        <div className={styles.configError}>
          <p className={styles.configErrorTitle}>שגיאת הגדרה בצד השרת</p>
          <p>{configError}</p>
        </div>
      ) : (
        <AdminLoginForm />
      )}
    </div>
  );
}
