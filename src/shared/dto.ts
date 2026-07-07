// DTO (view models) trả về cho client. Tách khỏi entity để kiểm soát dữ liệu lộ ra.
import type { CaseStatus } from "./status";

export interface LeadListItem {
  caseId: string;
  caseCode: string | null;
  companyName: string;
  taxCode: string | null;
  contactName: string;
  email: string;
  phone: string;
  status: CaseStatus;
  package: string | null;
  createdAt: string;
}

export interface CaseListItem extends LeadListItem {
  assignedLawyerName: string | null;
  slaDueAt: string | null;
  documentsTotal: number;
  documentsRequired: number;
}

export interface TimelineEntry {
  status: CaseStatus;
  label: string;
  note?: string | null;
  changedBy?: string | null;
  at: string;
}

export interface CaseDetail extends CaseListItem {
  organization: {
    name: string;
    taxCode: string | null;
    address: string | null;
    businessType: string | null;
    industry: string | null;
    headcount: number | null;
    market: string | null;
  };
  contact: { fullName: string; position: string | null; email: string; phone: string };
  scope: string[];
  objectives: string | null;
  timeline: TimelineEntry[];
  findingsSummary: { total: number; byRisk: Record<string, number>; approved: number };
}

export interface DashboardMetrics {
  totalLeads: number;
  inProgress: number;
  needMoreDocuments: number;
  awaitingLawyer: number;
  delivered: number;
  byStatus: { status: CaseStatus; label: string; count: number }[];
}
