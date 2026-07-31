import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { ViewerSwitcher } from "@/components/demo/ViewerSwitcher/ViewerSwitcher";
import { DashboardNav } from "@/components/business-dashboard/DashboardNav/DashboardNav";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import styles from "./dashboard-layout.module.css";

export default async function BusinessDashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await authAdapter.getCurrentUser();

  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <ViewerSwitcher currentViewerId={viewer?.id ?? null} />
      <DashboardNav />
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
