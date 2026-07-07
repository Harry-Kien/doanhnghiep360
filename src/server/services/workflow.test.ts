import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { transitionCase, StateTransitionError } from "./workflow";

const input = {
  companyName: "Công ty Test Workflow",
  taxCode: "0312000111",
  scope: ["corporate"] as string[],
  preferredMode: "either" as const,
  contactName: "Người Test",
  email: "test@wf.vn",
  phone: "0900000000",
  consent: true as const,
};

describe("workflow transitions", () => {
  beforeEach(() => __resetStore());

  it("tạo lead ⇒ trạng thái lead_new + có survey_request + audit", () => {
    const { caseId, leadStatus } = createLeadFromSurvey(input);
    const db = getDb();
    expect(leadStatus).toBe("lead_new");
    expect(db.cases.find((c) => c.id === caseId)?.status).toBe("lead_new");
    expect(db.surveyRequests.some((s) => s.caseId === caseId)).toBe(true);
    expect(db.auditLogs.some((a) => a.action === "lead.created" && a.entityId === caseId)).toBe(true);
  });

  it("cảnh báo trùng khi cùng MST còn case active", () => {
    createLeadFromSurvey(input);
    const second = createLeadFromSurvey(input);
    expect(second.duplicateWarning).toBe(true);
  });

  it("chuyển trạng thái hợp lệ ⇒ ghi history", () => {
    const { caseId } = createLeadFromSurvey(input);
    const updated = transitionCase(caseId, "lead_verified", { id: "u1", label: "Tester" });
    expect(updated.status).toBe("lead_verified");
    const db = getDb();
    expect(db.caseStatusHistory.some((h) => h.caseId === caseId && h.toStatus === "lead_verified")).toBe(true);
    expect(db.auditLogs.some((a) => a.action === "case.transition" && a.entityId === caseId)).toBe(true);
  });

  it("chuyển trạng thái không hợp lệ ⇒ ném lỗi, không đổi state", () => {
    const { caseId } = createLeadFromSurvey(input);
    expect(() => transitionCase(caseId, "approved", { id: "u1" })).toThrow(StateTransitionError);
    expect(getDb().cases.find((c) => c.id === caseId)?.status).toBe("lead_new");
  });
});
