import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { runAiAnalysis } from "./ai-analysis";

const lead = {
  companyName: "Cong ty AI Test",
  scope: ["corporate", "labor", "tax"] as string[],
  preferredMode: "either" as const,
  contactName: "Nguoi AI",
  email: "ai@test.vn",
  phone: "0900000999",
  consent: true as const,
};

describe("AI analysis (mock)", () => {
  beforeEach(() => __resetStore());

  it("tạo finding nháp kèm evidence, trạng thái ai_draft", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const res = await runAiAnalysis(caseId, { id: null, label: "Hệ thống AI" });
    expect(res.created).toBeGreaterThan(0);

    const findings = getDb().findings.filter((f) => f.caseId === caseId);
    expect(findings.length).toBe(res.created);
    for (const f of findings) {
      expect(f.needsLawyer).toBe(true);
      expect(f.evidence.length).toBeGreaterThan(0); // bắt buộc có chứng cứ
      expect(f.status).toBe("ai_draft");
    }
  });

  it("idempotent: chạy lại không nhân đôi finding", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await runAiAnalysis(caseId, { id: null });
    const first = getDb().findings.filter((f) => f.caseId === caseId).length;
    const again = await runAiAnalysis(caseId, { id: null });
    expect(again.created).toBe(0);
    expect(getDb().findings.filter((f) => f.caseId === caseId).length).toBe(first);
  });
});
