// Truy vấn hồ sơ + map sang DTO. Áp dụng data scoping theo role.
import { getDb } from "@/server/db";
import { CASE_STATUS_META, CASE_STATUSES, type CaseStatus, isActiveStatus } from "@/shared/status";
import { canViewAllCases, type Role } from "@/shared/roles";
import { PACKAGE_META, DOCUMENT_CHECKLIST } from "@/shared/constants";
import type { CaseDetail, CaseListItem, DashboardMetrics, LeadListItem, TimelineEntry } from "@/shared/dto";
import type { Case } from "@/shared/types";

export interface Viewer {
  id: string | null;
  role: Role;
  /** orgId của khách hàng (chỉ dùng khi role=customer). */
  orgId?: string | null;
}

function packageLabel(pkg: Case["package"]): string | null {
  return pkg ? PACKAGE_META[pkg].label : null;
}

function toLeadItem(c: Case): LeadListItem {
  const db = getDb();
  const org = db.organizations.find((o) => o.id === c.orgId);
  const contact = c.primaryContactId ? db.contacts.find((ct) => ct.id === c.primaryContactId) : undefined;
  return {
    caseId: c.id,
    caseCode: c.caseCode,
    companyName: org?.name ?? "—",
    taxCode: org?.taxCode ?? null,
    contactName: contact?.fullName ?? "—",
    email: contact?.email ?? "—",
    phone: contact?.phone ?? "—",
    status: c.status,
    package: packageLabel(c.package),
    createdAt: c.createdAt,
  };
}

function toCaseItem(c: Case): CaseListItem {
  const db = getDb();
  const lawyer = c.assignedLawyerId ? db.users.find((u) => u.id === c.assignedLawyerId) : undefined;
  const docs = db.documents.filter((d) => d.caseId === c.id && d.status !== "deleted");
  return {
    ...toLeadItem(c),
    assignedLawyerName: lawyer?.fullName ?? null,
    slaDueAt: c.slaDueAt,
    documentsTotal: docs.length,
    documentsRequired: DOCUMENT_CHECKLIST.filter((x) => x.required).length,
  };
}

function scopeCases(viewer: Viewer, cases: Case[]): Case[] {
  if (canViewAllCases(viewer.role)) return cases;
  if (viewer.role === "lawyer" || viewer.role === "staff") {
    return cases.filter((c) => c.assignedLawyerId === viewer.id || c.status !== "lead_new");
  }
  if (viewer.role === "customer") {
    return cases.filter((c) => c.orgId === viewer.orgId);
  }
  // Kế toán xử lý thương mại/thanh toán trên toàn bộ hồ sơ.
  if (viewer.role === "accountant") return cases;
  return cases.filter((c) => c.assignedLawyerId === viewer.id);
}

export function listLeads(
  viewer: Viewer,
  opts: { status?: CaseStatus; q?: string; page?: number; pageSize?: number } = {},
): { items: LeadListItem[]; total: number; page: number; pageSize: number } {
  const db = getDb();
  let cases = scopeCases(viewer, [...db.cases]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.status) cases = cases.filter((c) => c.status === opts.status);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    cases = cases.filter((c) => {
      const item = toLeadItem(c);
      return (
        item.companyName.toLowerCase().includes(q) ||
        (item.taxCode ?? "").includes(q) ||
        item.email.toLowerCase().includes(q) ||
        (item.caseCode ?? "").toLowerCase().includes(q)
      );
    });
  }
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const total = cases.length;
  const items = cases.slice((page - 1) * pageSize, page * pageSize).map(toLeadItem);
  return { items, total, page, pageSize };
}

export function listCases(viewer: Viewer, opts: { status?: CaseStatus; q?: string } = {}): CaseListItem[] {
  const db = getDb();
  let cases = scopeCases(viewer, [...db.cases]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.status) cases = cases.filter((c) => c.status === opts.status);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    cases = cases.filter((c) => toLeadItem(c).companyName.toLowerCase().includes(q));
  }
  return cases.map(toCaseItem);
}

export function getCaseDetail(viewer: Viewer, caseId: string): CaseDetail | { forbidden: true } | null {
  const db = getDb();
  const c = db.cases.find((x) => x.id === caseId);
  if (!c) return null;
  if (viewer.role === "customer" && c.orgId !== viewer.orgId) return { forbidden: true };
  if ((viewer.role === "lawyer" || viewer.role === "staff") && !canViewAllCases(viewer.role)) {
    // luật sư chỉ xem hồ sơ được phân công
    if (c.assignedLawyerId && c.assignedLawyerId !== viewer.id) return { forbidden: true };
  }

  const org = db.organizations.find((o) => o.id === c.orgId);
  const contact = c.primaryContactId ? db.contacts.find((ct) => ct.id === c.primaryContactId) : undefined;
  const sr = db.surveyRequests.find((s) => s.caseId === c.id);
  const scope = Array.isArray(sr?.payload.scope) ? (sr!.payload.scope as string[]) : [];

  const timeline: TimelineEntry[] = db.caseStatusHistory
    .filter((h) => h.caseId === c.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((h) => ({
      status: h.toStatus,
      label: CASE_STATUS_META[h.toStatus].label,
      note: h.note,
      changedBy: db.users.find((u) => u.id === h.changedById)?.fullName ?? null,
      at: h.createdAt,
    }));

  const findings = db.findings.filter((f) => f.caseId === c.id);
  const byRisk: Record<string, number> = {};
  for (const f of findings) byRisk[f.riskLevel] = (byRisk[f.riskLevel] ?? 0) + 1;

  return {
    ...toCaseItem(c),
    organization: {
      name: org?.name ?? "—",
      taxCode: org?.taxCode ?? null,
      address: org?.address ?? null,
      businessType: org?.businessType ?? null,
      industry: org?.industry ?? null,
      headcount: org?.headcount ?? null,
      market: org?.market ?? null,
    },
    contact: {
      fullName: contact?.fullName ?? "—",
      position: contact?.position ?? null,
      email: contact?.email ?? "—",
      phone: contact?.phone ?? "—",
    },
    scope,
    objectives: typeof sr?.payload.objectives === "string" ? sr.payload.objectives : null,
    timeline,
    findingsSummary: {
      total: findings.length,
      byRisk,
      approved: findings.filter((f) => f.status === "lawyer_accepted" || f.status === "lawyer_edited").length,
    },
  };
}

export function getDashboardMetrics(viewer: Viewer): DashboardMetrics {
  const db = getDb();
  const cases = scopeCases(viewer, [...db.cases]);
  const counts = new Map<CaseStatus, number>();
  for (const c of cases) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);

  return {
    totalLeads: cases.length,
    inProgress: cases.filter((c) => isActiveStatus(c.status) && c.status !== "lead_new").length,
    needMoreDocuments: cases.filter((c) => c.status === "need_more_documents").length,
    awaitingLawyer: cases.filter((c) => c.status === "lawyer_reviewing").length,
    delivered: cases.filter((c) => c.status === "delivered" || c.status === "completed").length,
    byStatus: CASE_STATUSES.map((s) => ({ status: s, label: CASE_STATUS_META[s].label, count: counts.get(s) ?? 0 })).filter(
      (x) => x.count > 0,
    ),
  };
}
