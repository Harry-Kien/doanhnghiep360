// Zod schemas — single source of truth cho validation FE & BE.
import { z } from "zod";
import { CASE_STATUSES } from "./status";
import { SERVICE_PACKAGES, RISK_LEVELS, SURVEY_SCOPE, BUSINESS_TYPES } from "./constants";

// Regex SĐT Việt Nam (di động/cố định, cho phép +84 hoặc 0).
const VN_PHONE = /^(?:\+84|0)(?:\d){8,10}$/;
// MST: 10 hoặc 13 chữ số (13 dạng 0000000000-001).
const VN_TAXCODE = /^\d{10}(-\d{3})?$/;

const scopeKeys = SURVEY_SCOPE.map((s) => s.key) as [string, ...string[]];

export const surveyRequestSchema = z.object({
  // Doanh nghiệp
  companyName: z.string().min(2, "Vui lòng nhập tên doanh nghiệp").max(200),
  taxCode: z
    .string()
    .trim()
    .regex(VN_TAXCODE, "Mã số thuế không hợp lệ (10 hoặc 13 số)")
    .optional()
    .or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  businessType: z.enum(BUSINESS_TYPES).optional().or(z.literal("")),
  industry: z.string().max(200).optional().or(z.literal("")),
  headcount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(1_000_000).optional(),
  ),
  market: z.string().max(200).optional().or(z.literal("")),

  // Người đại diện
  legalRepName: z.string().max(120).optional().or(z.literal("")),
  legalRepPosition: z.string().max(120).optional().or(z.literal("")),

  // Khảo sát
  scope: z.array(z.enum(scopeKeys)).min(1, "Chọn ít nhất một phạm vi khảo sát"),
  objectives: z.string().max(2000).optional().or(z.literal("")),
  specialRequests: z.string().max(2000).optional().or(z.literal("")),
  preferredTime: z.string().max(200).optional().or(z.literal("")),
  preferredMode: z.enum(["online", "offline", "either"]).default("either"),

  // Liên hệ (bắt buộc)
  contactName: z.string().min(2, "Vui lòng nhập họ tên người liên hệ").max(120),
  contactPosition: z.string().max(120).optional().or(z.literal("")),
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  phone: z
    .string()
    .min(1, "Vui lòng nhập số điện thoại")
    .regex(VN_PHONE, "Số điện thoại không hợp lệ"),

  note: z.string().max(2000).optional().or(z.literal("")),

  // Đồng ý xử lý dữ liệu (bắt buộc)
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bạn cần đồng ý điều khoản xử lý dữ liệu" }),
  }),
});

export type SurveyRequestInput = z.infer<typeof surveyRequestSchema>;

export const transitionSchema = z.object({
  toStatus: z.enum(CASE_STATUSES),
  note: z.string().max(1000).optional(),
});
export type TransitionInput = z.infer<typeof transitionSchema>;

export const conflictCheckSchema = z.object({
  result: z.enum(["clear", "potential_conflict", "rejected"]),
  matchedAgainst: z.array(z.string()).optional(),
  note: z.string().max(1000).optional(),
});
export type ConflictCheckInput = z.infer<typeof conflictCheckSchema>;

export const proposalSchema = z.object({
  package: z.enum(SERVICE_PACKAGES),
  amount: z.coerce.number().int().min(0),
  vatAmount: z.coerce.number().int().min(0).default(0),
  validUntil: z.string().optional(),
});
export type ProposalInput = z.infer<typeof proposalSchema>;

export const contractSchema = z.object({
  proposalId: z.string().optional(),
  templateVersion: z.string().default("HD-DV-PHAP-LY-v1"),
});
export type ContractInput = z.infer<typeof contractSchema>;

export const paymentSchema = z.object({
  milestone: z.enum(["deposit", "final"]),
  amount: z.coerce.number().int().min(0),
  method: z.string().max(60).optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

// Luật sư tự soạn 1 phát hiện (không qua AI). Có căn cứ pháp lý ⇒ đủ điều kiện vào báo cáo final.
export const findingCreateSchema = z.object({
  title: z.string().min(3, "Nhập tiêu đề phát hiện").max(300),
  description: z.string().min(3, "Nhập nội dung phát hiện").max(4000),
  riskLevel: z.enum(RISK_LEVELS),
  groupKey: z.enum(scopeKeys).default("corporate"),
  recommendation: z.string().max(4000).optional().or(z.literal("")),
  legalBasis: z.string().min(3, "Nhập căn cứ pháp lý").max(2000),
  evidence: z.string().max(2000).optional().or(z.literal("")),
});
export type FindingCreateInput = z.infer<typeof findingCreateSchema>;

export const findingReviewSchema = z.object({
  action: z.enum(["accept", "edit", "reject", "request_docs"]),
  title: z.string().max(300).optional(),
  description: z.string().max(4000).optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  recommendation: z.string().max(4000).optional(),
  legalBasis: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
});
export type FindingReviewInput = z.infer<typeof findingReviewSchema>;

export const leadListQuerySchema = z.object({
  status: z.enum(CASE_STATUSES).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
