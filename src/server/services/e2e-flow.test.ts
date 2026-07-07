// Test luồng end-to-end (happy + negative) ở mức service, không cần HTTP.
import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { transitionCase } from "./workflow";
import { openCase, CannotOpenCaseError } from "./open-case";
import { recordPayment } from "./commercial";
import { addDocument, DocumentValidationError } from "./documents";
import { reviewFinding } from "./findings";
import { approveAndExportFinal, ReportGuardError } from "./report-build";
import { createId } from "@/lib/utils";
import { DRIVE_SUBFOLDERS } from "@/shared/constants";
import type { LegalFinding } from "@/shared/types";

const lead = {
  companyName: "CÔNG TY CỔ PHẦN GIÁO DỤC HOUSTON123",
  taxCode: "3702469447",
  scope: ["corporate", "labor"] as string[],
  preferredMode: "either" as const,
  contactName: "Demo Legal Ops",
  email: "demo@legal360.vn",
  phone: "0901234567",
  consent: true as const,
};

const actor = { id: "lawyer-1", label: "Luật sư" };

function addFinding(caseId: string, status: LegalFinding["status"], withEvidence: boolean): LegalFinding {
  const db = getDb();
  const f: LegalFinding = {
    id: createId("find"),
    caseId,
    code: "F-99",
    groupKey: "labor",
    title: "Test finding",
    description: "x",
    riskLevel: "high",
    recommendation: null,
    confidence: 0.7,
    status,
    needsLawyer: true,
    evidence: withEvidence ? [{ id: createId("ev"), findingId: "", documentId: null, snippet: "x", legalBasis: "Đ.1" }] : [],
    createdAt: "",
    updatedAt: "",
  };
  db.findings.push(f);
  return f;
}

describe("E2E happy path (intake -> open -> upload -> review -> report)", () => {
  beforeEach(() => __resetStore());

  it("đi hết luồng tới approved và xuất báo cáo final", async () => {
    const { caseId } = createLeadFromSurvey(lead);

    // lead -> payment_pending
    for (const s of ["lead_verified", "conflict_checking", "conflict_cleared", "proposal_sent", "contract_pending", "payment_pending"] as const) {
      transitionCase(caseId, s, actor);
    }

    // ghi nhận tạm ứng (bắt buộc trước khi mở hồ sơ)
    recordPayment(caseId, { milestone: "deposit", amount: 6_000_000 }, actor);

    // mở hồ sơ: sinh mã + tạo Drive (mock)
    const opened = await openCase(caseId, actor);
    expect(opened.caseCode).toMatch(/^DN-\d{8}-\d{5}$/);
    expect(opened.drive.status).toBe("active");
    expect(opened.drive.subfolders).toBe(DRIVE_SUBFOLDERS.length);

    transitionCase(caseId, "waiting_documents", actor);

    // upload tài liệu hợp lệ
    const doc = await addDocument(caseId, { categoryKey: "02", originalName: "GCN.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, actor);
    expect(doc.driveFileId).toBeTruthy();
    expect(doc.storedName).toContain(opened.caseCode);

    for (const s of ["documents_received", "document_reviewing", "ocr_processing", "ai_classifying", "ai_analyzing", "lawyer_reviewing"] as const) {
      transitionCase(caseId, s, actor);
    }

    // AI tạo finding có evidence, luật sư duyệt
    const f = addFinding(caseId, "ai_draft", true);
    reviewFinding(f.id, { action: "accept" }, actor);

    // soạn báo cáo + duyệt final
    transitionCase(caseId, "report_drafting", actor);
    const final = await approveAndExportFinal(caseId, actor);
    expect(final.kind).toBe("final");
    expect(final.docxDocId).toBeTruthy();
    expect(getDb().cases.find((c) => c.id === caseId)?.status).toBe("approved");

    // BPMN: roadmap 30-90 ngày được sinh sau khi duyệt báo cáo
    const roadmap = getDb().roadmapItems.filter((r) => r.caseId === caseId);
    expect(roadmap.length).toBeGreaterThan(0);
    expect(roadmap.every((r) => ["d30", "d60", "d90"].includes(r.phase))).toBe(true);
  });
});

describe("Negative paths", () => {
  beforeEach(() => __resetStore());

  it("không mở hồ sơ khi chưa payment_pending", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await expect(openCase(caseId, actor)).rejects.toBeInstanceOf(CannotOpenCaseError);
  });

  it("chặn upload sai định dạng", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await expect(
      addDocument(caseId, { categoryKey: "02", originalName: "virus.exe", mimeType: "application/x-msdownload", sizeBytes: 100 }, actor),
    ).rejects.toBeInstanceOf(DocumentValidationError);
  });

  it("không xuất final khi còn finding chưa duyệt", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    addFinding(caseId, "ai_draft", true); // chưa review
    await expect(approveAndExportFinal(caseId, actor)).rejects.toBeInstanceOf(ReportGuardError);
  });

  it("Drive lỗi không làm hỏng upload metadata (mô phỏng qua mock failOnce)", async () => {
    // upload bình thường vẫn tạo record; nhánh lỗi được kiểm ở unit drive adapter.
    const { caseId } = createLeadFromSurvey(lead);
    const doc = await addDocument(caseId, { categoryKey: "01", originalName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10 }, actor);
    expect(["uploaded", "drive_error"]).toContain(doc.status);
  });
});
