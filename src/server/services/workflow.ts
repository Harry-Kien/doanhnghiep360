// State machine: chuyển trạng thái hồ sơ an toàn + ghi history + audit.
import { getDb, commit } from "@/server/db";
import { canTransition, CASE_STATUS_META, type CaseStatus } from "@/shared/status";
import { recordAudit } from "@/server/services/audit";
import { createId } from "@/lib/utils";
import type { Case } from "@/shared/types";

export class StateTransitionError extends Error {
  constructor(
    public from: CaseStatus,
    public to: CaseStatus,
  ) {
    super(`Không thể chuyển trạng thái từ "${CASE_STATUS_META[from].label}" sang "${CASE_STATUS_META[to].label}"`);
    this.name = "StateTransitionError";
  }
}

export function transitionCase(
  caseId: string,
  toStatus: CaseStatus,
  actor: { id: string | null; label?: string },
  note?: string,
): Case {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  const from = theCase.status;
  if (from === toStatus) return theCase;
  if (!canTransition(from, toStatus)) throw new StateTransitionError(from, toStatus);

  theCase.status = toStatus;
  theCase.updatedAt = new Date().toISOString();

  db.caseStatusHistory.push({
    id: createId("hist"),
    caseId,
    fromStatus: from,
    toStatus,
    changedById: actor.id,
    note: note ?? null,
    createdAt: new Date().toISOString(),
  });
  commit();

  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "case.transition",
    entityType: "case",
    entityId: caseId,
    metadata: { from, to: toStatus, note },
  });

  return theCase;
}
