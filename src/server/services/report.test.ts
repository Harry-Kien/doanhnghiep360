import { describe, it, expect } from "vitest";
import {
  assertCanExportFinal,
  selectFinalFindings,
  isFindingFinalReady,
  EvidenceRequiredError,
  LawyerApprovalRequiredError,
} from "./report";
import type { LegalFinding } from "@/shared/types";

function finding(over: Partial<LegalFinding>): LegalFinding {
  return {
    id: "f1",
    caseId: "c1",
    code: "F-01",
    groupKey: "labor",
    title: "Test",
    description: "desc",
    riskLevel: "high",
    recommendation: null,
    confidence: 0.8,
    status: "ai_draft",
    needsLawyer: true,
    evidence: [],
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

const withEvidence = [{ id: "e1", findingId: "f1", documentId: null, snippet: "x", legalBasis: "Đ.1" }];

describe("report invariants", () => {
  it("finding chưa duyệt KHÔNG đủ điều kiện vào final", () => {
    expect(isFindingFinalReady(finding({ status: "ai_draft", evidence: withEvidence }))).toBe(false);
  });

  it("finding đã duyệt + có evidence ĐỦ điều kiện", () => {
    expect(isFindingFinalReady(finding({ status: "lawyer_accepted", evidence: withEvidence }))).toBe(true);
  });

  it("không export final khi chưa có lawyer approval", () => {
    expect(() =>
      assertCanExportFinal({ hasLawyerApproval: false, findings: [finding({ status: "lawyer_accepted", evidence: withEvidence })] }),
    ).toThrow(LawyerApprovalRequiredError);
  });

  it("finding đã duyệt nhưng thiếu evidence ⇒ chặn final", () => {
    expect(() =>
      selectFinalFindings([finding({ status: "lawyer_accepted", evidence: [] })]),
    ).toThrow(EvidenceRequiredError);
  });

  it("chỉ chọn finding đã duyệt vào final", () => {
    const result = selectFinalFindings([
      finding({ id: "a", status: "lawyer_accepted", evidence: withEvidence }),
      finding({ id: "b", status: "ai_draft", evidence: withEvidence }),
      finding({ id: "c", status: "rejected", evidence: withEvidence }),
    ]);
    expect(result.map((f) => f.id)).toEqual(["a"]);
  });
});
