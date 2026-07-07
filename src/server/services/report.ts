// Quy tắc bất biến cho báo cáo (testable, dùng ở Phase 9).
// - Finding chỉ vào final khi đã được luật sư duyệt VÀ có ≥1 evidence.
// - Không export final khi chưa có lawyer approval.
import type { LegalFinding } from "@/shared/types";

export class EvidenceRequiredError extends Error {
  constructor(public findingCodes: string[]) {
    super(`Có finding thiếu chứng cứ, không thể đưa vào báo cáo final: ${findingCodes.join(", ")}`);
    this.name = "EvidenceRequiredError";
  }
}

export class LawyerApprovalRequiredError extends Error {
  constructor() {
    super("Chưa có luật sư duyệt báo cáo (approve_report). Không thể xuất bản final.");
    this.name = "LawyerApprovalRequiredError";
  }
}

/** Finding đủ điều kiện vào báo cáo final. */
export function isFindingFinalReady(f: LegalFinding): boolean {
  const reviewed = f.status === "lawyer_accepted" || f.status === "lawyer_edited";
  return reviewed && f.evidence.length > 0;
}

/** Lọc finding cho báo cáo final; ném lỗi nếu có finding đã duyệt nhưng thiếu evidence. */
export function selectFinalFindings(findings: LegalFinding[]): LegalFinding[] {
  const reviewed = findings.filter((f) => f.status === "lawyer_accepted" || f.status === "lawyer_edited");
  const missingEvidence = reviewed.filter((f) => f.evidence.length === 0);
  if (missingEvidence.length > 0) {
    throw new EvidenceRequiredError(missingEvidence.map((f) => f.code));
  }
  return reviewed;
}

/**
 * Kiểm tra có thể xuất báo cáo final hay không.
 * @throws LawyerApprovalRequiredError nếu chưa có approval.
 */
export function assertCanExportFinal(opts: {
  hasLawyerApproval: boolean;
  findings: LegalFinding[];
}): LegalFinding[] {
  if (!opts.hasLawyerApproval) throw new LawyerApprovalRequiredError();
  return selectFinalFindings(opts.findings);
}
