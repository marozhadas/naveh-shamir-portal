import "server-only";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { MockEmailProvider } from "./mock-email-provider";
import { SupabaseEdgeFunctionEmailProvider } from "./supabase-edge-email-provider";
import type { EmailProviderAdapter } from "./email-provider";

export function getEmailProvider(): EmailProviderAdapter {
  if (!isSupabaseAdminConfigured()) return new MockEmailProvider();
  return new SupabaseEdgeFunctionEmailProvider();
}
