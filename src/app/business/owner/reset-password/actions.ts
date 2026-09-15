"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type UpdatePasswordState = { status: "idle" | "error"; message?: string };

/**
 * Sets a new password for the currently-signed-in session — which, on this page, is always the
 * short-lived "recovery" session /auth/callback established from the reset-password email link,
 * never a password the caller supplies otherwise. If there's no valid recovery session (link
 * expired, already used, or this page was opened directly), signOut-free updateUser simply fails
 * and the generic message tells the user to request a fresh link rather than exposing why.
 */
export async function updatePasswordAction(_prevState: UpdatePasswordState, formData: FormData): Promise<UpdatePasswordState> {
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const confirmPassword = typeof formData.get("confirmPassword") === "string" ? (formData.get("confirmPassword") as string) : "";

  if (password.length < 8) return { status: "error", message: "הסיסמה חייבת להיות באורך של לפחות 8 תווים." };
  if (password !== confirmPassword) return { status: "error", message: "הסיסמאות אינן תואמות." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[updatePasswordAction] updateUser failed:", error.message);
    return { status: "error", message: "לא הצלחנו לעדכן את הסיסמה. יש לבקש קישור איפוס חדש ולנסות שוב." };
  }

  redirect("/business/dashboard");
}
