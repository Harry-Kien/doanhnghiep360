// Chứng minh các entity mới được PERSIST qua luồng (không chỉ nằm trong docs/Prisma).
import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { addDocument } from "./documents";
import { runAiAnalysis } from "./ai-analysis";
import { reviewFinding } from "./findings";
import { approveAndExportFinal } from "./report-build";

const lead = {
  companyName: "Cong ty Persistence",
  scope: ["corporate", "labor", "tax"] as string[],
  preferredMode: "either" as const,
  contactName: "Nguoi P",
  email: "p@persist.vn",
  phone: "0900000777",
  consent: true as const,
};
const actor = { id: "u1", label: "Tester" };

describe("entity persistence through workflow", () => {
  beforeEach(() => __resetStore());

  it("upload ⇒ documents + document_versions", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const doc = await addDocument(caseId, { categoryKey: "02", originalName: "a.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, actor);
    const db = getDb();
    expect(db.documents.some((d) => d.id === doc.id)).toBe(true);
    expect(db.documentVersions.filter((v) => v.documentId === doc.id)).toHaveLength(1);
  });

  it("AI analyze ⇒ ai_runs (ocr+analyze) + risk_scores + extracted_fields + findings", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    // OCR chạy theo từng tài liệu ⇒ upload 1 tài liệu để có 1 ai_run OCR.
    await addDocument(caseId, { categoryKey: "02", originalName: "ho-so.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, actor);
    const res = await runAiAnalysis(caseId, actor);
    const db = getDb();
    expect(res.created).toBeGreaterThan(0);
    expect(db.aiRuns.filter((r) => r.caseId === caseId && r.type === "ocr")).toHaveLength(1);
    expect(db.aiRuns.filter((r) => r.caseId === caseId && r.type === "analyze")).toHaveLength(1);
    expect(db.riskScores.filter((r) => r.caseId === caseId).length).toBeGreaterThan(0);
    expect(db.extractedFields.filter((r) => r.caseId === caseId).length).toBeGreaterThan(0);
  });

  it("lawyer review ⇒ lawyer_reviews; approve ⇒ notification + report_versions(final)", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await runAiAnalysis(caseId, actor);
    const db = getDb();
    const findings = db.findings.filter((f) => f.caseId === caseId);
    for (const f of findings) reviewFinding(f.id, { action: "accept" }, actor);
    expect(db.lawyerReviews.filter((r) => r.caseId === caseId).length).toBe(findings.length);

    await approveAndExportFinal(caseId, actor);
    expect(db.notifications.length).toBeGreaterThan(0);
    expect(db.reportVersions.some((v) => v.kind === "final")).toBe(true);
  });
});
