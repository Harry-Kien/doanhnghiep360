// Tạo lead từ phiếu yêu cầu khảo sát (intake). Tạo org/contact/case/survey_request.
import { getDb, commit } from "@/server/db";
import { createId, slugify } from "@/lib/utils";
import { recordAudit } from "@/server/services/audit";
import { isActiveStatus } from "@/shared/status";
import type { SurveyRequestInput } from "@/shared/schemas";
import type { Case, Contact, Organization, SurveyRequest } from "@/shared/types";

export interface CreateLeadResult {
  caseId: string;
  leadStatus: "lead_new";
  duplicateWarning: boolean;
}

export function createLeadFromSurvey(input: SurveyRequestInput): CreateLeadResult {
  const db = getDb();
  const now = new Date().toISOString();
  const taxCode = input.taxCode && input.taxCode !== "" ? input.taxCode : null;

  // Cảnh báo trùng: cùng MST và đang có case active.
  let duplicateWarning = false;
  if (taxCode) {
    const existingOrg = db.organizations.find((o) => o.taxCode === taxCode);
    if (existingOrg) {
      duplicateWarning = db.cases.some((c) => c.orgId === existingOrg.id && isActiveStatus(c.status));
    }
  }

  // Tái sử dụng organization theo MST nếu có; nếu không tạo mới.
  let org = taxCode ? db.organizations.find((o) => o.taxCode === taxCode) : undefined;
  if (!org) {
    org = {
      id: createId("org"),
      name: input.companyName,
      slug: slugify(input.companyName),
      taxCode,
      address: input.address || null,
      businessType: input.businessType || null,
      industry: input.industry || null,
      headcount: typeof input.headcount === "number" ? input.headcount : null,
      market: input.market || null,
      createdAt: now,
      updatedAt: now,
    } satisfies Organization;
    db.organizations.push(org);
  }

  const contact: Contact = {
    id: createId("ct"),
    orgId: org.id,
    fullName: input.contactName,
    position: input.contactPosition || null,
    email: input.email,
    phone: input.phone,
    isPrimary: true,
    createdAt: now,
    updatedAt: now,
  };
  db.contacts.push(contact);

  const theCase: Case = {
    id: createId("case"),
    caseCode: null,
    orgId: org.id,
    primaryContactId: contact.id,
    status: "lead_new",
    package: null,
    assignedLawyerId: null,
    reviewerId: null,
    intakeOwnerId: null,
    openedAt: null,
    slaDueAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.cases.push(theCase);

  const sr: SurveyRequest = {
    id: createId("sr"),
    caseId: theCase.id,
    payload: { ...input },
    leadStatus: "lead_new",
    createdAt: now,
    updatedAt: now,
  };
  db.surveyRequests.push(sr);

  db.caseStatusHistory.push({
    id: createId("hist"),
    caseId: theCase.id,
    fromStatus: null,
    toStatus: "lead_new",
    changedById: null,
    note: "Khách hàng gửi phiếu yêu cầu khảo sát qua landing page.",
    createdAt: now,
  });
  commit();

  recordAudit({
    actorId: null,
    actorLabel: "Khách hàng (public)",
    action: "lead.created",
    entityType: "case",
    entityId: theCase.id,
    metadata: { company: input.companyName, taxCode, duplicateWarning },
  });

  return { caseId: theCase.id, leadStatus: "lead_new", duplicateWarning };
}
