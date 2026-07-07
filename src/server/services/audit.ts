// Ghi audit log cho mọi hành động quan trọng.
import { getDb, commit } from "@/server/db";
import { createId } from "@/lib/utils";

export interface AuditInput {
  actorId: string | null;
  actorLabel?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}

export function recordAudit(input: AuditInput): void {
  const db = getDb();
  db.auditLogs.push({
    id: createId("aud"),
    actorId: input.actorId,
    actorLabel: input.actorLabel,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  });
  commit();
}

export function listAuditLogs(filter?: { entityType?: string; entityId?: string; limit?: number }) {
  const db = getDb();
  let logs = [...db.auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (filter?.entityType) logs = logs.filter((l) => l.entityType === filter.entityType);
  if (filter?.entityId) logs = logs.filter((l) => l.entityId === filter.entityId);
  return logs.slice(0, filter?.limit ?? 100);
}
