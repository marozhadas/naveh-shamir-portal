"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createProfile, isUsernameTaken, resolvePostLoginPath } from "@/repositories/owner-auth-service";
import { normalizeUsername, isValidUsername } from "@/utils/username";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";

export type SignupState = { status: "idle" | "error" | "check-email"; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SIGNUP_ERROR = "לא הצלחנו ליצור את החשבון כרגע. אם כבר יש לך חשבון עם המייל הזה, אפשר לנסות להתחבר במקום.";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Creates a real Supabase Auth user (email + password) and its matching `profiles` row. Never
 * stores a password or hash anywhere of our own — `supabase.auth.signUp` is the only thing that
 * ever sees the raw password, and Supabase Auth is the only place it's ever persisted.
 */
export async function signupWithPasswordAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const fullName = readField(formData, "fullName");
  const usernameRaw = readField(formData, "username");
  const email = readField(formData, "email");
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const confirmPassword = typeof formData.get("confirmPassword") === "string" ? (formData.get("confirmPassword") as string) : "";

  if (!fullName) return { status: "error", message: "יש להזין שם מלא." };

  const username = normalizeUsername(usernameRaw);
  if (!isValidUsername(username)) {
    return { status: "error", message: "שם משתמש לא תקין — אותיות אנגליות קטנות, מספרים ומקפים בלבד, 3–30 תווים." };
  }
  if (!EMAIL_PATTERN.test(email)) return { status: "error", message: "כתובת המייל אינה תקינה." };
  if (password.length < 8) return { status: "error", message: "הסיסמה חייבת להיות באורך של לפחות 8 תווים." };
  if (password !== confirmPassword) return { status: "error", message: "הסיסמאות אינן תואמות." };

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`owner-signup:${ip}`, 10, 3600);
  if (!allowed) return { status: "error", message: "יותר מדי ניסיונות הרשמה. אפשר לנסות שוב בעוד כמה דקות." };

  // Pre-check (not airtight against a simultaneous signup with the same username — accepted as a
  // narrow, rare race for a small community site) so the common case never creates an orphaned
  // auth.users row with no profile.
  if (await isUsernameTaken(username)) {
    return { status: "error", message: "שם המשתמש הזה כבר תפוס — נסו שם אחר." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    console.error("[signupWithPasswordAction] signUp failed:", error?.message);
    return { status: "error", message: GENERIC_SIGNUP_ERROR };
  }

  const profileResult = await createProfile({ id: data.user.id, username, displayName: fullName, email });
  if (!profileResult.success) {
    return {
      status: "error",
      message: profileResult.reason === "username-taken" ? "שם המשתמש הזה כבר תפוס — נסו שם אחר." : GENERIC_SIGNUP_ERROR,
    };
  }

  // No session yet means Supabase's "Confirm email" setting is on — the user must click the
  // confirmation link before they have a session at all.
  if (!data.session) {
    return { status: "check-email", message: "שלחנו מייל לאישור החשבון — יש ללחוץ על הקישור שם כדי להמשיך." };
  }

  redirect(await resolvePostLoginPath(data.user.id));
}
