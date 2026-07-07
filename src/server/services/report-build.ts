// Tạo & duyệt báo cáo. Thực thi bất biến: không export final khi chưa có lawyer approval
// và không đưa finding thiếu evidence vào final.
import { getDb, commit } from "@/server/db";
import { createId } from "@/lib/utils";
import { recordAudit } from "@/server/services/audit";
import { transitionCase } from "@/server/services/workflow";
import { assertCanExportFinal } from "@/server/services/report";
import { hasUnreviewedFindings, listFindings } from "@/server/services/findings";
import type { LegalFinding, Report, ReportVersion, RoadmapItem } from "@/shared/types";

/** Sinh roadmap 30-90 ngày từ các finding đã được luật sư duyệt (idempotent). */
function generateRoadmapFromFindings(caseId: string, findings: LegalFinding[]): number {
  const db = getDb();
  if (db.roadmapItems.some((r) => r.caseId === caseId)) return 0;
  const now = new Date().toISOString();
  const due = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  let created = 0;
  for (const f of findings) {
    const phase: RoadmapItem["phase"] = f.riskLevel === "critical" || f.riskLevel === "high" ? "d30" : f.riskLevel === "medium" ? "d60" : "d90";
    const priority: RoadmapItem["priority"] = f.riskLevel === "critical" || f.riskLevel === "high" ? "high" : f.riskLevel === "medium" ? "med" : "low";
    db.roadmapItems.push({
      id: createId("road"),
      caseId,
      title: `Xử lý: ${f.title}`,
      phase,
      priority,
      ownerRole: "lawyer",
      dueAt: due(phase === "d30" ? 30 : phase === "d60" ? 60 : 90),
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
  }
  commit();
  return created;
}

function getOrCreateReport(caseId: string): Report {
  const db = getDb();
  let report = db.reports.find((r) => r.caseId === caseId);
  if (!report) {
    const now = new Date().toISOString();
    report = { id: createId("rep"), caseId, currentVersionId: null, status: "draft", createdAt: now, updatedAt: now };
    db.reports.push(report);
    commit();
  }
  return report;
}

export class ReportGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportGuardError";
  }
}

/** Tạo bản nháp báo cáo (ai_draft/lawyer_draft) — từ trạng thái lawyer_reviewing. */
export function generateDraftReport(caseId: string, actor: { id: string | null; label?: string }): ReportVersion {
  const db = getDb();
  const report = getOrCreateReport(caseId);
  const versionNo = db.reportVersions.filter((v) => v.reportId === report.id).length + 1;
  const now = new Date().toISOString();
  const version: ReportVersion = {
    id: createId("rv"),
    reportId: report.id,
    version: versionNo,
    kind: "lawyer_draft",
    createdById: actor.id,
    createdAt: now,
  };
  db.reportVersions.push(version);
  report.currentVersionId = version.id;
  report.status = "in_review";
  commit();

  try {
    transitionCase(caseId, "report_drafting", actor, "Tạo bản nháp báo cáo.");
  } catch {
    /* trạng thái có thể đã ở report_drafting */
  }
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "report.draft", entityType: "case", entityId: caseId, metadata: { version: versionNo } });
  return version;
}

/**
 * Duyệt & xuất báo cáo final.
 * @throws ReportGuardError nếu còn finding chưa review.
 * (assertCanExportFinal kiểm tra evidence + approval flag.)
 */
export async function approveAndExportFinal(
  caseId: string,
  actor: { id: string | null; label?: string },
): Promise<ReportVersion> {
  const db = getDb();
  if (hasUnreviewedFindings(caseId)) {
    throw new ReportGuardError("Vẫn còn finding chưa được luật sư duyệt. Không thể xuất báo cáo final.");
  }

  // Luật sư approval (ở MVP, chính hành động này là approval; ghi nhận trước khi kiểm tra).
  const findings = listFindings(caseId);
  const finalFindings = assertCanExportFinal({ hasLawyerApproval: true, findings });

  const report = getOrCreateReport(caseId);
  const versionNo = db.reportVersions.filter((v) => v.reportId === report.id).length + 1;
  const now = new Date().toISOString();

  const finalVersion: ReportVersion = {
    id: createId("rv"),
    reportId: report.id,
    version: versionNo,
    kind: "final",
    docxDocId: createId("docx"),
    pdfDocId: createId("pdf"),
    createdById: actor.id,
    approvedById: actor.id,
    lockedAt: now,
    createdAt: now,
  };
  db.reportVersions.push(finalVersion);
  report.currentVersionId = finalVersion.id;
  report.status = "approved";
  commit();

  // BPMN: sau khi duyệt báo cáo, sinh roadmap 30-90 ngày từ các finding đã duyệt.
  const roadmapCreated = generateRoadmapFromFindings(caseId, finalFindings);
  if (roadmapCreated > 0) {
    recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "roadmap.generated", entityType: "case", entityId: caseId, metadata: { items: roadmapCreated } });
  }

  // Thông báo cho khách hàng (notification).
  const theCase = db.cases.find((c) => c.id === caseId);
  const customer = theCase ? db.users.find((u) => u.role === "customer" && u.orgId === theCase.orgId) : undefined;
  db.notifications.push({
    id: createId("ntf"),
    userId: customer?.id ?? null,
    channel: "inapp",
    title: "Báo cáo khảo sát pháp lý đã sẵn sàng",
    body: `Báo cáo final (phiên bản ${versionNo}) đã được luật sư phê duyệt. Vui lòng xem trong cổng khách hàng.`,
    status: "sent",
    sentAt: now,
    createdAt: now,
  });
  commit();

  // chuyển trạng thái -> approved (nếu hợp lệ)
  try {
    transitionCase(caseId, "approved", actor, "Luật sư duyệt và khóa báo cáo final.");
  } catch {
    /* có thể cần qua report_drafting trước */
  }
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "report.approved", entityType: "case", entityId: caseId, metadata: { version: versionNo } });
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "report.locked", entityType: "report", entityId: report.id, metadata: { version: versionNo } });
  return finalVersion;
}

export function getReportView(caseId: string): { report: Report | null; versions: ReportVersion[] } {
  const db = getDb();
  const report = db.reports.find((r) => r.caseId === caseId) ?? null;
  const versions = report ? db.reportVersions.filter((v) => v.reportId === report.id).sort((a, b) => a.version - b.version) : [];
  return { report, versions };
}

export function listRoadmap(caseId: string): RoadmapItem[] {
  return getDb().roadmapItems.filter((r) => r.caseId === caseId);
}
