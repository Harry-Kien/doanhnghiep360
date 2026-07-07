// Đợt B: upload bytes thật ⇒ tải lại đúng nội dung; sinh báo cáo DOCX/HTML thật từ finding đã duyệt.
import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { addDocument } from "./documents";
import { runAiAnalysis } from "./ai-analysis";
import { reviewFinding, addFinding } from "./findings";
import { selectFinalFindings } from "./report";
import { buildReportModel, generateReportDocx, renderReportHtml } from "./report-doc";
import { getDriveAdapter } from "@/server/adapters/drive";

const lead = {
  companyName: "Cong ty Dot B",
  scope: ["corporate", "tax"] as string[],
  preferredMode: "either" as const,
  contactName: "Nguoi B",
  email: "b@dotb.vn",
  phone: "0900000888",
  consent: true as const,
};
const actor = { id: "u1", label: "Tester" };

describe("Đợt B — upload bytes + tải lại", () => {
  beforeEach(() => __resetStore());

  it("upload PDF có bytes ⇒ lưu Drive (mock đĩa) + tải lại đúng nội dung", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const content = Buffer.from("%PDF-1.4\nNoi dung tai lieu test Dot B\n%%EOF");
    const doc = await addDocument(
      caseId,
      { categoryKey: "02", originalName: "ho-so.pdf", mimeType: "application/pdf", sizeBytes: content.length, content },
      actor,
    );
    expect(doc.driveFileId).toBeTruthy();
    expect(doc.status).toBe("uploaded");
    expect(doc.sizeBytes).toBe(content.length);

    const adapter = await getDriveAdapter();
    const back = await adapter.downloadFile(doc.driveFileId!);
    expect(back).not.toBeNull();
    expect(back!.equals(content)).toBe(true);
  });

  it("từ chối khi nội dung không khớp MIME khai báo (magic bytes)", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const notPdf = Buffer.from("đây không phải PDF");
    await expect(
      addDocument(caseId, { categoryKey: "02", originalName: "fake.pdf", mimeType: "application/pdf", sizeBytes: notPdf.length, content: notPdf }, actor),
    ).rejects.toThrow();
  });
});

describe("Đợt B — sinh báo cáo thật", () => {
  beforeEach(() => __resetStore());

  it("buildReportModel + DOCX (zip 'PK') + HTML chứa mã hồ sơ", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await runAiAnalysis(caseId, actor);
    for (const f of getDb().findings.filter((f) => f.caseId === caseId)) {
      reviewFinding(f.id, { action: "accept" }, actor);
    }
    const model = buildReportModel(caseId);
    expect(model).not.toBeNull();
    expect(model!.findings.length).toBeGreaterThan(0);

    const docx = await generateReportDocx(model!);
    expect(docx.length).toBeGreaterThan(1000);
    expect(docx.subarray(0, 2).toString("ascii")).toBe("PK"); // .docx là zip

    const html = renderReportHtml(model!);
    expect(html).toContain(model!.caseCode);
    expect(html).toContain("BÁO CÁO KHẢO SÁT PHÁP LÝ");
  });
});

describe("Luật sư tự thêm phát hiện thủ công", () => {
  beforeEach(() => __resetStore());

  it("addFinding tạo finding lawyer_edited + có căn cứ ⇒ vào thẳng báo cáo final", () => {
    const { caseId } = createLeadFromSurvey(lead);
    const f = addFinding(
      caseId,
      {
        title: "Điều lệ thiếu quy định chuyển nhượng cổ phần",
        description: "Điều lệ chưa quy định trình tự chuyển nhượng cổ phần cho cổ đông sáng lập.",
        riskLevel: "high",
        groupKey: "corporate",
        recommendation: "Bổ sung điều khoản theo Luật Doanh nghiệp 2020.",
        legalBasis: "Luật Doanh nghiệp 2020, Điều 127",
        evidence: "Điều 12 Điều lệ công ty",
      },
      actor,
    );
    expect(f.status).toBe("lawyer_edited");
    expect(f.code).toMatch(/^F-M\d+$/);
    expect(f.evidence[0]?.legalBasis).toContain("Điều 127");

    // Đủ điều kiện vào final (đã review + có evidence) — không ném lỗi.
    const final = selectFinalFindings(listFindingsAll(caseId));
    expect(final.some((x) => x.id === f.id)).toBe(true);

    const model = buildReportModel(caseId);
    expect(model!.findings.some((x) => x.id === f.id)).toBe(true);
    expect(model!.counts.high).toBeGreaterThanOrEqual(1);
  });
});

function listFindingsAll(caseId: string) {
  return getDb().findings.filter((f) => f.caseId === caseId);
}
