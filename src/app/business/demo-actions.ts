"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_VIEWER_COOKIE } from "@/adapters/mock-auth-adapter";

/**
 * Demo-only (spec section 48): flips who the mock auth adapter reports as "signed in" by setting
 * a plainly-named cookie from a form the ViewerSwitcher component renders. This is not a login —
 * there is no password, no session, no real account — and it must never be mistaken for one.
 */
export async function setDemoViewerAction(formData: FormData): Promise<void> {
  const key = formData.get("viewer");
  const store = await cookies();

  if (typeof key === "string" && key.length > 0) {
    store.set(DEMO_VIEWER_COOKIE, key, { path: "/", httpOnly: false, sameSite: "lax" });
  } else {
    store.delete(DEMO_VIEWER_COOKIE);
  }

  revalidatePath("/", "layout");
}
