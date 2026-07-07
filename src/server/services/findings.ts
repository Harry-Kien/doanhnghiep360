// Lawyer review: accept/edit/reject/request_docs + tự soạn finding thủ công.
import { getDb, commit } from "@/server/db";
import { createId } from "@/lib/utils";
import { recordAudit } from "@/server/services/audit";
import { transitionCase } from "@/server/services/workflow";
import type { FindingReviewInput, FindingCreateInput } from "@/shared/schemas";
import type { LegalFinding } from "@/shared/types";

export function listFindings(caseId: string): LegalFinding[] {
  return getDb().findings.filter((f) => f.caseId === caseId);
}

export class FindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FindingError";
  }
}

/**
 * Luật sư tự thêm 1 phát hiện (không qua AI). Tạo finding ở trạng thái lawyer_edited
 * (đã là nội dung do luật sư soạn) kèm 1 evidence + căn cứ pháp lý ⇒ đủ điều kiện vào báo cáo final.
 */
export function addFinding(
  caseId: string,
  input: FindingCreateInput,
  actor: { id: string | null; label?: string },
): LegalFinding {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  const now = new Date().toISOString();
  // Mã finding thủ công: F-M## (phân biệt với finding AI).
  const seq = db.findings.filter((f) => f.caseId === caseId).length + 1;
  const findingId = createId("find");
  const finding: LegalFinding = {
    id: findingId,
    caseId,
    code: `F-M${String(seq).padStart(2, "0")}`,
    groupKey: input.groupKey,
    title: input.title,
    description: input.description,
    riskLevel: input.riskLevel,
    recommendation: input.recommendation || null,
    confidence: 1,
    status: "lawyer_edited",
    needsLawyer: false,
    evidence: [
      {
        id: createId("ev"),
        findingId,
        documentId: null,
        snippet: input.evidence && input.evidence.length > 0 ? input.evidence : input.legalBasis,
        legalBasis: input.legalBasis,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  db.findings.push(finding);
  db.lawyerReviews.push({
    id: createId("lr"),
    caseId,
    findingId,
    reviewerId: actor.id,
    action: "manual_add",
    note: input.legalBasis,
    createdAt: now,
  });
  commit();

  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "finding.manual_add",
    entityType: "finding",
    entityId: findingId,
    metadata: { caseId, code: finding.code, riskLevel: finding.riskLevel, groupKey: finding.groupKey },
  });
  return finding;
}

/** Còn finding chưa được luật sư xử lý (vẫn ở ai_draft/checker_flagged). */
export function hasUnreviewedFindings(caseId: string): boolean {
  return listFindings(caseId).some((f) => f.status === "ai_draft" || f.status === "checker_flagged");
}

export function reviewFinding(
  findingId: string,
  input: FindingReviewInput,
  actor: { id: string | null; label?: string },
): LegalFinding {
  const db = getDb();
  const finding = db.findings.find((f) => f.id === findingId);
  if (!finding) throw new Error("NOT_FOUND");
  const now = new Date().toISOString();

  switch (input.action) {
    case "accept":
      finding.status = "lawyer_accepted";
      break;
    case "edit":
      if (input.title) finding.title = input.title;
      if (input.description) finding.description = input.description;
      if (input.riskLevel) finding.riskLevel = input.riskLevel;
      if (input.recommendation) finding.recommendation = input.recommendation;
      if (input.legalBasis && finding.evidence[0]) finding.evidence[0].legalBasis = input.legalBasis;
      finding.status = "lawyer_edited";
      break;
    case "reject":
      finding.status = "rejected";
      break;
    case "request_docs":
      // Yêu cầu bổ sung tài liệu ⇒ chuyển hồ sơ sang need_more_documents.
      try {
        transitionCase(finding.caseId, "need_more_documents", actor, input.note ?? "Luật sư yêu cầu bổ sung tài liệu.");
      } catch {
        // nếu trạng thái không cho phép, vẫn ghi review
      }
      break;
  }
  finding.updatedAt = now;

  db.lawyerReviews.push({
    id: createId("lr"),
    caseId: finding.caseId,
    findingId,
    reviewerId: actor.id,
    action: input.action,
    note: input.note ?? input.legalBasis ?? null,
    createdAt: now,
  });

  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "finding.review",
    entityType: "finding",
    entityId: findingId,
    metadata: { action: input.action, caseId: finding.caseId, newStatus: finding.status },
  });
  commit();
  return finding;
}
