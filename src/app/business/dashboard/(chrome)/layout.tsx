import type { ReactNode } from "react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { ViewerSwitcher } from "@/components/demo/ViewerSwitcher/ViewerSwitcher";
import { DashboardNav } from "@/components/business-dashboard/DashboardNav/DashboardNav";
import { LogoutButton } from "@/components/business-dashboard/LogoutButton/LogoutButton";
import { authAdapter, isRealBusinessOwnerSession } from "@/adapters/mock-auth-adapter";
import styles from "./dashboard-layout.module.css";

export default async function BusinessDashboardLayout({ children }: { children: ReactNode }) {
  const [viewer, isRealSession] = await Promise.all([authAdapter.getCurrentUser(), isRealBusinessOwnerSession()]);

  return (
    <>
      <ConnectedHeader />
      {!isRealSession && <ViewerSwitcher currentViewerId={viewer?.id ?? null} />}
      <DashboardNav />
      {isRealSession && (
        <div className={styles.logoutRow}>
          <LogoutButton />
        </div>
      )}
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
