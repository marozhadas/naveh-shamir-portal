import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { AdminAuditAction, AdminAuditLogRow } from "@/types/admin-notification";

type RecordAuditLogParams = {
  adminId: string | null;
  action: AdminAuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records an admin action for the audit trail. Never pass passwords, secret keys, tokens, or other
 * sensitive values in `metadata` — only structural facts (what was changed, on what entity).
 */
export async function recordAuditLog({ adminId, action, entityType, entityId, metadata }: RecordAuditLogParams): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

/** Read side of the audit trail for a single entity — used on detail pages that show "what happened here". */
export async function getAuditLogForEntity(entityType: string, entityId: string): Promise<AdminAuditLogRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
