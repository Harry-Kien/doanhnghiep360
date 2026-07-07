import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { transitionCase } from "./workflow";
import {
  recordConflictCheck,
  createProposal,
  sendProposal,
  createContract,
  markContractSigned,
  recordPayment,
  acceptProposalByCustomer,
  acceptContractByCustomer,
  notifyPaymentByCustomer,
  CommercialGuardError,
} from "./commercial";
import { openCase, CannotOpenCaseError } from "./open-case";

const lead = {
  companyName: "Cong ty Commercial Test",
  taxCode: "0312777888",
  scope: ["corporate"] as string[],
  preferredMode: "either" as const,
  contactName: "Nguoi Test",
  email: "c@test.vn",
  phone: "0900000123",
  consent: true as const,
};
const actor = { id: "intake-1", label: "Intake" };

describe("Phase 2 — commercial flow", () => {
  beforeEach(() => __resetStore());

  it("conflict clear ⇒ chuyển sang conflict_cleared", () => {
    const { caseId } = createLeadFromSurvey(lead);
    transitionCase(caseId, "lead_verified", actor);
    recordConflictCheck(caseId, { result: "clear" }, actor);
    expect(getDb().cases.find((c) => c.id === caseId)?.status).toBe("conflict_cleared");
  });

  it("conflict rejected ⇒ hồ sơ bị hủy", () => {
    const { caseId } = createLeadFromSurvey(lead);
    transitionCase(caseId, "lead_verified", actor);
    recordConflictCheck(caseId, { result: "rejected" }, actor);
    expect(getDb().cases.find((c) => c.id === caseId)?.status).toBe("cancelled");
  });

  it("không tạo báo phí khi chưa conflict clear", () => {
    const { caseId } = createLeadFromSurvey(lead);
    transitionCase(caseId, "lead_verified", actor);
    expect(() => createProposal(caseId, { package: "pro", amount: 12_000_000, vatAmount: 960_000 }, actor)).toThrow(CommercialGuardError);
  });

  it("chuỗi đầy đủ: conflict → báo phí → hợp đồng → thanh toán → mở hồ sơ", () => {
    const { caseId } = createLeadFromSurvey(lead);
    transitionCase(caseId, "lead_verified", actor);
    recordConflictCheck(caseId, { result: "clear" }, actor);

    const p = createProposal(caseId, { package: "pro", amount: 12_000_000, vatAmount: 960_000 }, actor);
    sendProposal(caseId, p.id, actor);
    expect(getDb().cases.find((c) => c.id === caseId)?.status).toBe("proposal_sent");

    const c = createContract(caseId, { templateVersion: "HD-DV-PHAP-LY-v1" }, actor);
    expect(getDb().cases.find((x) => x.id === caseId)?.status).toBe("contract_pending");

    markContractSigned(caseId, c.id, actor);
    expect(getDb().cases.find((x) => x.id === caseId)?.status).toBe("payment_pending");

    // chưa thanh toán ⇒ chưa mở được
    return expect(openCase(caseId, actor)).rejects.toBeInstanceOf(CannotOpenCaseError).then(() => {
      recordPayment(caseId, { milestone: "deposit", amount: 6_000_000 }, actor);
      return openCase(caseId, actor).then((res) => {
        expect(res.caseCode).toMatch(/^DN-\d{8}-\d{5}$/);
        expect(getDb().cases.find((x) => x.id === caseId)?.status).toBe("case_opened");
      });
    });
  });

  it("không tạo hợp đồng khi chưa gửi báo phí", () => {
    const { caseId } = createLeadFromSurvey(lead);
    transitionCase(caseId, "lead_verified", actor);
    recordConflictCheck(caseId, { result: "clear" }, actor);
    expect(() => createContract(caseId, { templateVersion: "v1" }, actor)).toThrow(CommercialGuardError);
  });
});

describe("Phase 2 — self-service của khách hàng (cổng khách)", () => {
  beforeEach(() => __resetStore());
  const cust = { id: "cust-1", label: "Khách hàng" };

  function toProposalSent(caseId: string) {
    transitionCase(caseId, "lead_verified", actor);
    recordConflictCheck(caseId, { result: "clear" }, actor);
    const p = createProposal(caseId, { package: "pro", amount: 12_000_000, vatAmount: 960_000 }, actor);
    sendProposal(caseId, p.id, actor);
    return p;
  }

  it("khách đồng ý báo phí ⇒ status accepted", () => {
    const { caseId } = createLeadFromSurvey(lead);
    const p = toProposalSent(caseId);
    const r = acceptProposalByCustomer(caseId, p.id, cust);
    expect(r.status).toBe("accepted");
  });

  it("khách xác nhận hợp đồng ⇒ signed + hồ sơ chuyển payment_pending", () => {
    const { caseId } = createLeadFromSurvey(lead);
    const p = toProposalSent(caseId);
    const c = createContract(caseId, { proposalId: p.id, templateVersion: "v1" }, actor);
    const r = acceptContractByCustomer(caseId, c.id, cust);
    expect(r.status).toBe("signed");
    expect(getDb().cases.find((x) => x.id === caseId)?.status).toBe("payment_pending");
  });

  it("không đồng ý được báo phí chưa gửi (draft) ⇒ CommercialGuardError", () => {
    const { caseId } = createLeadFromSurvey(lead);
    transitionCase(caseId, "lead_verified", actor);
    recordConflictCheck(caseId, { result: "clear" }, actor);
    const p = createProposal(caseId, { package: "pro", amount: 1, vatAmount: 0 }, actor); // draft, chưa send
    expect(() => acceptProposalByCustomer(caseId, p.id, cust)).toThrow(CommercialGuardError);
  });

  it("khách báo đã chuyển khoản ⇒ tạo notification cho nội bộ", () => {
    const { caseId } = createLeadFromSurvey(lead);
    toProposalSent(caseId);
    notifyPaymentByCustomer(caseId, cust);
    expect(getDb().notifications.some((n) => n.title.includes("đã chuyển khoản"))).toBe(true);
  });
});
