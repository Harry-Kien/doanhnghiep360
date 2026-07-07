import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { getCaseDetail, listLeads, type Viewer } from "./cases";
import { checkCaseAccess } from "@/lib/case-access";
import { canAccessSection, canViewAllCases } from "@/shared/roles";

function leadInput(name: string, tax: string, email: string) {
  return {
    companyName: name,
    taxCode: tax,
    scope: ["corporate"] as string[],
    preferredMode: "either" as const,
    contactName: "LH " + name,
    email,
    phone: "0900000000",
    consent: true as const,
  };
}

describe("RBAC & data scoping", () => {
  beforeEach(() => __resetStore());

  it("khách hàng KHÔNG xem được hồ sơ của công ty khác (403)", () => {
    const a = createLeadFromSurvey(leadInput("Cong ty A", "0312000001", "a@a.vn"));
    const b = createLeadFromSurvey(leadInput("Cong ty B", "0312000002", "b@b.vn"));
    const orgA = getDb().cases.find((c) => c.id === a.caseId)!.orgId;

    const viewerA: Viewer = { id: null, role: "customer", orgId: orgA };
    // xem hồ sơ của chính mình ⇒ OK
    const own = getCaseDetail(viewerA, a.caseId);
    expect(own && !("forbidden" in own)).toBe(true);
    // xem hồ sơ công ty khác ⇒ forbidden
    const other = getCaseDetail(viewerA, b.caseId);
    expect(other).toEqual({ forbidden: true });
  });

  it("danh sách của khách hàng chỉ chứa hồ sơ của org mình", () => {
    const a = createLeadFromSurvey(leadInput("Cong ty A", "0312000001", "a@a.vn"));
    createLeadFromSurvey(leadInput("Cong ty B", "0312000002", "b@b.vn"));
    const orgA = getDb().cases.find((c) => c.id === a.caseId)!.orgId;
    const viewerA: Viewer = { id: null, role: "customer", orgId: orgA };
    const list = listLeads(viewerA);
    expect(list.items.every((i) => i.companyName === "Cong ty A")).toBe(true);
  });

  it("khách hàng KHÔNG được upload tài liệu cho hồ sơ của công ty khác", () => {
    const a = createLeadFromSurvey(leadInput("Cong ty A", "0312000001", "a@a.vn"));
    const b = createLeadFromSurvey(leadInput("Cong ty B", "0312000002", "b@b.vn"));
    const orgA = getDb().cases.find((c) => c.id === a.caseId)!.orgId;

    const viewerA: Viewer = { id: "customer-a", role: "customer", orgId: orgA };
    expect(checkCaseAccess(viewerA, a.caseId)).toMatchObject({ ok: true });
    expect(checkCaseAccess(viewerA, b.caseId)).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("intake KHÔNG có quyền section admin; customer KHÔNG có quyền lawyer", () => {
    expect(canAccessSection("intake", "admin")).toBe(false);
    expect(canAccessSection("customer", "lawyer")).toBe(false);
    expect(canAccessSection("lawyer", "lawyer")).toBe(true);
    expect(canAccessSection("admin", "admin")).toBe(true);
  });

  it("chỉ admin/intake/reviewer được xem toàn bộ hồ sơ", () => {
    expect(canViewAllCases("admin")).toBe(true);
    expect(canViewAllCases("intake")).toBe(true);
    expect(canViewAllCases("customer")).toBe(false);
    expect(canViewAllCases("lawyer")).toBe(false);
  });
});
