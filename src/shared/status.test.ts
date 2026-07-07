import { describe, it, expect } from "vitest";
import {
  CASE_STATUSES,
  CASE_STATUS_META,
  CASE_STATUS_TRANSITIONS,
  canTransition,
  isCaseStatus,
} from "./status";

describe("case status state machine", () => {
  it("có metadata và transition cho mọi trạng thái", () => {
    for (const s of CASE_STATUSES) {
      expect(CASE_STATUS_META[s]).toBeDefined();
      expect(CASE_STATUS_TRANSITIONS[s]).toBeDefined();
    }
  });

  it("cho phép chuyển hợp lệ theo happy path", () => {
    const doanhNghiep360Path = [
      "lead_new",
      "info_form_sent",
      "info_form_uploaded",
      "online_meeting_scheduled",
      "online_meeting_done",
      "checklist_in_progress",
      "onsite_survey_scheduled",
      "onsite_survey_done",
      "document_reviewing",
      "lawyer_analysis",
      "report_drafting",
      "report_sent_to_customer",
      "explanation_meeting_done",
      "report_revision",
      "reviewer_approval",
      "final_report_ready",
      "delivered",
      "retainer_proposal_sent",
      "completed",
    ] as const;

    for (let i = 0; i < doanhNghiep360Path.length - 1; i += 1) {
      expect(canTransition(doanhNghiep360Path[i], doanhNghiep360Path[i + 1])).toBe(true);
    }
  });

  it("chặn chuyển trạng thái không hợp lệ", () => {
    expect(canTransition("lead_new", "approved")).toBe(false);
    expect(canTransition("completed", "lead_new")).toBe(false);
    expect(canTransition("case_opened", "lead_verified")).toBe(false);
  });

  it("cho phép khách upload Mẫu 01 từ lead mới để vào bước đã nhận phiếu", () => {
    expect(canTransition("lead_new", "info_form_uploaded")).toBe(true);
  });

  it("trạng thái đóng không có lối ra", () => {
    expect(CASE_STATUS_TRANSITIONS.completed).toHaveLength(0);
    expect(CASE_STATUS_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it("isCaseStatus nhận diện đúng", () => {
    expect(isCaseStatus("lead_new")).toBe(true);
    expect(isCaseStatus("khong_ton_tai")).toBe(false);
  });

  it("mọi trạng thái đích đều là trạng thái hợp lệ", () => {
    for (const targets of Object.values(CASE_STATUS_TRANSITIONS)) {
      for (const t of targets) expect(isCaseStatus(t)).toBe(true);
    }
  });
});
