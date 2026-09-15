import { signOutAction } from "@/app/business/owner/signout-action";
import styles from "./LogoutButton.module.css";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className={styles.button}>
        התנתקות
      </button>
    </form>
  );
}
