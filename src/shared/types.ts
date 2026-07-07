// Domain entity types — plain data, dùng bởi repository và các service.
// Mirror prisma/schema.prisma (rút gọn cho MVP).
import type { CaseStatus } from "./status";
import type { Role } from "./roles";
import type { ServicePackage, RiskLevel } from "./constants";

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  fullName: string;
  role: Role;
  /** Mật khẩu đã hash (scrypt salt:hash). Không bao giờ trả ra client. */
  passwordHash?: string | null;
  /** Với khách hàng: gắn với tổ chức để giới hạn truy cập hồ sơ. */
  orgId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  taxCode?: string | null;
  address?: string | null;
  businessType?: string | null;
  industry?: string | null;
  headcount?: number | null;
  market?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  orgId: string;
  fullName: string;
  position?: string | null;
  email: string;
  phone: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  caseCode: string | null;
  orgId: string;
  primaryContactId: string | null;
  status: CaseStatus;
  package: ServicePackage | null;
  assignedLawyerId: string | null;
  reviewerId: string | null;
  intakeOwnerId: string | null;
  openedAt: string | null;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStatusHistory {
  id: string;
  caseId: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  changedById: string | null;
  note?: string | null;
  createdAt: string;
}

export type ConflictResult = "clear" | "potential_conflict" | "rejected";

export interface ConflictCheck {
  id: string;
  caseId: string;
  result: ConflictResult;
  checkedById: string | null;
  matchedAgainst?: string[];
  note?: string | null;
  createdAt: string;
}

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

export interface Proposal {
  id: string;
  caseId: string;
  code: string;
  package: ServicePackage;
  amount: number;
  vatAmount: number;
  currency: string;
  status: ProposalStatus;
  validUntil: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContractStatus = "draft" | "sent" | "signed" | "void";

export interface Contract {
  id: string;
  caseId: string;
  proposalId: string | null;
  code: string;
  templateVersion: string;
  status: ContractStatus;
  signedDocumentId: string | null;
  signedAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMilestone = "deposit" | "final";
export type PaymentStatus = "pending" | "paid" | "overdue";

export interface Payment {
  id: string;
  caseId: string;
  milestone: PaymentMilestone;
  amount: number;
  method: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyRequest {
  id: string;
  caseId: string;
  payload: Record<string, unknown>;
  leadStatus: CaseStatus;
  createdAt: string;
  updatedAt: string;
}

export type DriveFolderStatus = "active" | "drive_pending" | "error";

export interface DriveFolder {
  id: string;
  caseId: string;
  driveFolderId: string | null;
  name: string;
  parentFolderId: string | null;
  subfolderKey: string | null;
  status: DriveFolderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  caseId: string;
  categoryKey: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  driveFileId: string | null;
  uploaderId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type FindingStatus =
  | "ai_draft"
  | "checker_flagged"
  | "lawyer_accepted"
  | "lawyer_edited"
  | "rejected";

export interface FindingEvidence {
  id: string;
  findingId: string;
  documentId: string | null;
  snippet: string;
  legalBasis?: string | null;
}

export interface LegalFinding {
  id: string;
  caseId: string;
  code: string;
  groupKey: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  recommendation?: string | null;
  confidence?: number | null;
  status: FindingStatus;
  needsLawyer: boolean;
  evidence: FindingEvidence[];
  createdAt: string;
  updatedAt: string;
}

export type ReportKind = "ai_draft" | "lawyer_draft" | "final";

export interface ReportVersion {
  id: string;
  reportId: string;
  version: number;
  kind: ReportKind;
  docxDocId?: string | null;
  pdfDocId?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  lockedAt?: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  caseId: string;
  currentVersionId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapItem {
  id: string;
  caseId: string;
  title: string;
  phase: "d30" | "d60" | "d90";
  priority: "low" | "med" | "high";
  ownerRole?: string | null;
  dueAt?: string | null;
  status: "open" | "in_progress" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  driveFileId: string | null;
  uploaderId: string | null;
  note?: string | null;
  createdAt: string;
}

export type AiRunType = "ocr" | "extract" | "classify" | "analyze" | "check";
export type AiRunStatus = "queued" | "running" | "done" | "error";

export interface AiRun {
  id: string;
  caseId: string;
  type: AiRunType;
  provider: string;
  status: AiRunStatus;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  confidence: number | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface ExtractedField {
  id: string;
  caseId: string;
  documentId: string | null;
  aiRunId: string | null;
  key: string;
  value: string | null;
  confidence: number | null;
  createdAt: string;
}

export interface LawyerReview {
  id: string;
  caseId: string;
  findingId: string | null;
  reviewerId: string | null;
  action: string;
  note?: string | null;
  createdAt: string;
}

export interface RiskScore {
  id: string;
  caseId: string;
  groupKey: string;
  score: number;
  level: RiskLevel;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string | null;
  channel: "email" | "sms" | "zalo" | "inapp";
  title: string;
  body?: string | null;
  status: "pending" | "sent";
  sentAt: string | null;
  createdAt: string;
}

export interface SurveyPlan {
  id: string;
  caseId: string;
  mode: "online" | "offline";
  scheduledAt: string | null;
  location: string | null;
  meetingUrl: string | null;
  participants?: string[];
  createdAt: string;
}

export interface SurveySession {
  id: string;
  planId: string;
  startedAt: string | null;
  endedAt: string | null;
  conductedById: string | null;
  createdAt: string;
}

export interface SurveyMinute {
  id: string;
  sessionId: string;
  content: Record<string, unknown>;
  exportedDocId: string | null;
  createdAt: string;
}

export interface SurveyAnswer {
  id: string;
  sessionId: string;
  groupKey: string;
  questionKey: string;
  answer: string | null;
  evidenceDocumentId: string | null;
  createdAt: string;
}

export interface OtpChallenge {
  id: string;
  caseId: string;
  email: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorLabel?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
