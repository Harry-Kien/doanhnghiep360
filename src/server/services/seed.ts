// Seed dữ liệu mẫu thực tế từ nghiệp vụ Legal360 (KHÔNG phải dữ liệu khách hàng thật).
// Chạy lazy 1 lần. Tạo user theo từng role + vài hồ sơ ở các trạng thái khác nhau.
import { rawDb, commit } from "@/server/db/store";
import { createId, slugify } from "@/lib/utils";
import { hashPassword } from "@/lib/auth";
import { generateCaseCode } from "@/server/services/case-code";
import { DRIVE_SUBFOLDERS } from "@/shared/constants";
import type { CaseStatus } from "@/shared/status";
import type { ServicePackage, RiskLevel } from "@/shared/constants";
import type {
  Case,
  Contact,
  Contract,
  DocumentRecord,
  LegalFinding,
  Organization,
  Payment,
  Proposal,
  Report,
  ReportVersion,
  RoadmapItem,
  SurveyRequest,
  User,
} from "@/shared/types";
import type { Role } from "@/shared/roles";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

const USERS: Array<{ fullName: string; role: Role; email: string }> = [
  { fullName: "Ths-Ls. Lý Ngọc Sơn", role: "admin", email: "admin@legal360.vn" },
  { fullName: "Ls. Trần Văn Thuận", role: "reviewer", email: "reviewer@legal360.vn" },
  { fullName: "Ls. Thân Thị Thu Phương", role: "lawyer", email: "lawyer@legal360.vn" },
  { fullName: "Ls. Phạm Xuân Thành", role: "lawyer", email: "lawyer2@legal360.vn" },
  { fullName: "Ls. Nguyễn Thị Thu Hạnh", role: "staff", email: "staff@legal360.vn" },
  { fullName: "Ls. Nguyễn Thành Tuấn", role: "intake", email: "intake@legal360.vn" },
  { fullName: "Ls. Nguyễn Thị An Huyền", role: "lawyer", email: "lawyer3@legal360.vn" },
  { fullName: "Ths. Nguyễn Phan Ngọc Trâm", role: "accountant", email: "accountant@legal360.vn" },
  { fullName: "Công ty CP Giáo dục Houston123", role: "customer", email: "khach@legal360.vn" },
];

interface SeedCaseSpec {
  company: string;
  taxCode: string;
  businessType: string;
  industry: string;
  headcount: number;
  contactName: string;
  email: string;
  phone: string;
  status: CaseStatus;
  pkg: ServicePackage | null;
  scope: string[];
  withCode: boolean;
  ageDays: number;
  findings?: Array<{ title: string; risk: RiskLevel; group: string }>;
}

const CASE_SPECS: SeedCaseSpec[] = [
  {
    company: "Công ty CP Thực phẩm Hừng Đông",
    taxCode: "0312345678",
    businessType: "Công ty cổ phần",
    industry: "Sản xuất thực phẩm",
    headcount: 120,
    contactName: "Đặng Thị Lan",
    email: "lan.dang@hungdong.vn",
    phone: "0903123456",
    status: "lead_new",
    pkg: null,
    scope: ["corporate", "labor", "tax"],
    withCode: false,
    ageDays: 0,
  },
  {
    company: "Công ty TNHH Logistics Tân Cảng Việt",
    taxCode: "0398765432",
    businessType: "Công ty TNHH hai thành viên trở lên",
    industry: "Vận tải & kho bãi",
    headcount: 60,
    contactName: "Bùi Quốc Huy",
    email: "huy.bui@tancangviet.vn",
    phone: "0912988777",
    status: "conflict_checking",
    pkg: "pro",
    scope: ["corporate", "commercial", "labor"],
    withCode: false,
    ageDays: 2,
  },
  {
    company: "Công ty CP Công nghệ NovaSoft",
    taxCode: "0101239876",
    businessType: "Công ty cổ phần",
    industry: "Phần mềm & CNTT",
    headcount: 85,
    contactName: "Phan Anh Tú",
    email: "tu.phan@novasoft.vn",
    phone: "0987654321",
    status: "info_form_sent",
    pkg: "premium",
    scope: ["corporate", "ip", "labor", "tax", "commercial"],
    withCode: true,
    ageDays: 6,
  },
  {
    company: "Công ty TNHH May mặc Phương Đông",
    taxCode: "0309988776",
    businessType: "Công ty TNHH một thành viên",
    industry: "Dệt may",
    headcount: 340,
    contactName: "Trịnh Thu Hà",
    email: "ha.trinh@phuongdong.vn",
    phone: "0934567890",
    status: "onsite_survey_scheduled",
    pkg: "pro",
    scope: ["labor", "tax", "commercial", "dispute"],
    withCode: true,
    ageDays: 12,
    findings: [
      { title: "Hợp đồng lao động thiếu phụ lục công việc", risk: "medium", group: "labor" },
      { title: "Chưa đăng ký nội quy lao động với Sở LĐTBXH", risk: "high", group: "labor" },
      { title: "Điều khoản phạt vi phạm hợp đồng vượt mức luật cho phép", risk: "high", group: "commercial" },
      { title: "Thiếu hồ sơ chứng minh nguồn gốc nguyên liệu nhập", risk: "low", group: "tax" },
    ],
  },
  {
    company: "Công ty CP Bất động sản An Khang",
    taxCode: "0305566778",
    businessType: "Công ty cổ phần",
    industry: "Bất động sản",
    headcount: 45,
    contactName: "Lý Gia Bảo",
    email: "bao.ly@ankhang.vn",
    phone: "0901222333",
    status: "reviewer_approval",
    pkg: "premium",
    scope: ["corporate", "investment", "dispute", "commercial"],
    withCode: true,
    ageDays: 9,
  },
  {
    company: "Công ty TNHH F&B Sài Gòn Kitchen",
    taxCode: "0316677889",
    businessType: "Công ty TNHH một thành viên",
    industry: "Nhà hàng & dịch vụ ăn uống",
    headcount: 28,
    contactName: "Ngô Mỹ Linh",
    email: "linh.ngo@sgkitchen.vn",
    phone: "0978111222",
    status: "delivered",
    pkg: "basic",
    scope: ["corporate", "labor", "tax"],
    withCode: true,
    ageDays: 20,
    findings: [
      { title: "Giấy phép an toàn thực phẩm sắp hết hạn", risk: "critical", group: "corporate" },
      { title: "Chưa ký HĐLĐ với 3 nhân viên thời vụ", risk: "medium", group: "labor" },
    ],
  },
];

// Mật khẩu demo dùng chung cho mọi tài khoản seed.
export const DEMO_PASSWORD = "legal360";

// Hash 1 lần/tiến trình (scrypt tốn CPU) — tái dùng cho mọi lần seed.
let cachedPwHash: string | null = null;

function stableUserId(email: string): string {
  return `usr_${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

function buildUsers(): User[] {
  const now = daysAgo(30);
  const pw = (cachedPwHash ??= hashPassword(DEMO_PASSWORD));
  return USERS.map((u) => ({
    id: stableUserId(u.email),
    email: u.email,
    phone: null,
    fullName: u.fullName,
    role: u.role,
    passwordHash: pw,
    orgId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}

function normalizeSeededUsers(db: ReturnType<typeof rawDb>, demoMode: boolean): boolean {
  let changed = false;
  const now = new Date().toISOString();

  const admin = db.users.find((u) => u.email.toLowerCase() === "admin@legal360.vn" || u.role === "admin");
  if (admin && admin.fullName !== "Ths-Ls. Lý Ngọc Sơn") {
    admin.fullName = "Ths-Ls. Lý Ngọc Sơn";
    admin.updatedAt = now;
    changed = true;
  }

  if (!demoMode) return changed;

  const oldCustomer = db.users.find((u) => u.email.toLowerCase() === "khach@demo.vn");
  if (oldCustomer) {
    oldCustomer.email = "khach@legal360.vn";
    oldCustomer.fullName = "Công ty CP Giáo dục Houston123";
    oldCustomer.updatedAt = now;
    changed = true;
  }

  const pw = (cachedPwHash ??= hashPassword(DEMO_PASSWORD));
  for (const userSpec of USERS) {
    const existing = db.users.find((u) => u.email.toLowerCase() === userSpec.email.toLowerCase());
    if (existing) {
      if (existing.fullName !== userSpec.fullName || existing.role !== userSpec.role || !existing.passwordHash) {
        existing.fullName = userSpec.fullName;
        existing.role = userSpec.role;
        existing.passwordHash = existing.passwordHash ?? pw;
        existing.updatedAt = now;
        changed = true;
      }
      continue;
    }

    db.users.push({
      id: stableUserId(userSpec.email),
      email: userSpec.email,
      phone: null,
      fullName: userSpec.fullName,
      role: userSpec.role,
      passwordHash: pw,
      orgId: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    changed = true;
  }

  return changed;
}

export function ensureSeeded(): void {
  const db = rawDb();
  const appBaseUrl = process.env.APP_BASE_URL ?? "";
  const demoMode =
    process.env.NODE_ENV !== "production" ||
    process.env.SEED_DEMO === "true" ||
    appBaseUrl.includes("localhost") ||
    appBaseUrl.includes("127.0.0.1");
  if (db.meta.seeded) {
    if (normalizeSeededUsers(db, demoMode)) commit();
    return;
  }
  db.meta.seeded = true;

  // PRODUCTION: không seed dữ liệu demo (không hồ sơ mẫu, không tài khoản demo).
  // Chỉ tạo 1 tài khoản ADMIN MASTER để đăng nhập và tự tạo nhân sự thật.
  // Dev/test vẫn seed đầy đủ demo. Ép seed demo ở production bằng SEED_DEMO=true.
  if (!demoMode) {
    const now = new Date().toISOString();
    db.users.push({
      id: stableUserId((process.env.ADMIN_EMAIL || "admin@legal360.vn").trim().toLowerCase()),
      email: (process.env.ADMIN_EMAIL || "admin@legal360.vn").trim().toLowerCase(),
      phone: null,
      fullName: "Ths-Ls. Lý Ngọc Sơn",
      role: "admin",
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "Legal360@Admin"),
      orgId: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    commit();
    return;
  }

  const users = buildUsers();
  db.users.push(...users);
  const lawyer = users.find((u) => u.role === "lawyer")!;
  const reviewer = users.find((u) => u.role === "reviewer")!;
  const intake = users.find((u) => u.role === "intake")!;

  // Hồ sơ flagship cho demo end-to-end.
  seedHoustonFlagship(users);

  for (const spec of CASE_SPECS) {
    const createdAt = daysAgo(spec.ageDays);
    const org: Organization = {
      id: createId("org"),
      name: spec.company,
      slug: slugify(spec.company),
      taxCode: spec.taxCode,
      address: "TP. Hồ Chí Minh",
      businessType: spec.businessType,
      industry: spec.industry,
      headcount: spec.headcount,
      market: "Việt Nam",
      createdAt,
      updatedAt: createdAt,
    };
    db.organizations.push(org);

    const contact: Contact = {
      id: createId("ct"),
      orgId: org.id,
      fullName: spec.contactName,
      position: "Người phụ trách pháp chế",
      email: spec.email,
      phone: spec.phone,
      isPrimary: true,
      createdAt,
      updatedAt: createdAt,
    };
    db.contacts.push(contact);

    const advanced = spec.status !== "lead_new" && spec.status !== "conflict_checking";
    const theCase: Case = {
      id: createId("case"),
      caseCode: spec.withCode ? generateCaseCode(new Date(createdAt)) : null,
      orgId: org.id,
      primaryContactId: contact.id,
      status: spec.status,
      package: spec.pkg,
      assignedLawyerId: advanced ? lawyer.id : null,
      reviewerId: spec.status === "delivered" ? reviewer.id : null,
      intakeOwnerId: intake.id,
      openedAt: spec.withCode ? createdAt : null,
      slaDueAt: advanced ? daysFromNow(14 - spec.ageDays) : null,
      createdAt,
      updatedAt: createdAt,
    };
    db.cases.push(theCase);

    const sr: SurveyRequest = {
      id: createId("sr"),
      caseId: theCase.id,
      payload: {
        companyName: spec.company,
        taxCode: spec.taxCode,
        scope: spec.scope,
        objectives: "Đánh giá tổng thể rủi ro pháp lý và xây dựng roadmap xử lý.",
        contactName: spec.contactName,
        email: spec.email,
        phone: spec.phone,
      },
      leadStatus: spec.status,
      createdAt,
      updatedAt: createdAt,
    };
    db.surveyRequests.push(sr);

    db.caseStatusHistory.push({
      id: createId("hist"),
      caseId: theCase.id,
      fromStatus: null,
      toStatus: "lead_new",
      changedById: intake.id,
      note: "Khởi tạo từ phiếu yêu cầu khảo sát.",
      createdAt,
    });
    if (spec.status !== "lead_new") {
      db.caseStatusHistory.push({
        id: createId("hist"),
        caseId: theCase.id,
        fromStatus: "lead_new",
        toStatus: spec.status,
        changedById: intake.id,
        note: "Cập nhật tiến độ hồ sơ.",
        createdAt: daysAgo(Math.max(0, spec.ageDays - 1)),
      });
    }

    if (spec.findings?.length) {
      for (const [i, f] of spec.findings.entries()) {
        const finding: LegalFinding = {
          id: createId("find"),
          caseId: theCase.id,
          code: `F-${String(i + 1).padStart(2, "0")}`,
          groupKey: f.group,
          title: f.title,
          description: "Phát hiện sơ bộ từ AI, cần luật sư kiểm tra và bổ sung căn cứ pháp luật.",
          riskLevel: f.risk,
          recommendation: "Đề xuất xử lý theo roadmap; xem chi tiết trong báo cáo.",
          confidence: 0.72,
          status: spec.status === "delivered" ? "lawyer_accepted" : "ai_draft",
          needsLawyer: true,
          evidence: [
            {
              id: createId("ev"),
              findingId: "",
              documentId: null,
              snippet: "Trích đoạn tài liệu minh chứng cần đối chiếu với bản gốc.",
              legalBasis: spec.status === "delivered" ? "Bộ luật Lao động 2019, Điều 118" : null,
            },
          ],
          createdAt,
          updatedAt: createdAt,
        };
        finding.evidence[0]!.findingId = finding.id;
        db.findings.push(finding);
      }
    }

    db.auditLogs.push({
      id: createId("aud"),
      actorId: intake.id,
      actorLabel: intake.fullName,
      action: "case.created",
      entityType: "case",
      entityId: theCase.id,
      metadata: { company: spec.company, status: spec.status },
      createdAt,
    });
  }

  commit();
}

/**
 * Hồ sơ flagship CÔNG TY CỔ PHẦN GIÁO DỤC HOUSTON123 (DN-20260618-00001).
 * Trạng thái lawyer_analysis với tài liệu, finding, báo cáo nháp, roadmap và audit log
 * để chạy local là thấy ngay luồng thật.
 */
function seedHoustonFlagship(users: User[]): void {
  const db = rawDb();
  const lawyer = users.find((u) => u.role === "lawyer")!;
  const intake = users.find((u) => u.role === "intake")!;
  const customer = users.find((u) => u.role === "customer")!;

  const opened = daysAgo(8);
  const caseCode = "DN-20260618-00001";
  // Giữ counter ngày 20260618 không bị trùng với mã literal này.
  db.caseCodeCounters["20260618"] = Math.max(db.caseCodeCounters["20260618"] ?? 0, 1);

  const org: Organization = {
    id: createId("org"),
    name: "CÔNG TY CỔ PHẦN GIÁO DỤC HOUSTON123",
    slug: "HOUSTON123",
    taxCode: "3702469447",
    address: "TP. Thủ Đức, TP. Hồ Chí Minh",
    businessType: "Công ty cổ phần",
    industry: "Giáo dục / lập trình máy vi tính",
    headcount: 4,
    market: "Việt Nam",
    createdAt: opened,
    updatedAt: opened,
  };
  db.organizations.push(org);

  const contact: Contact = {
    id: createId("ct"),
    orgId: org.id,
    fullName: "Người phụ trách pháp chế Houston123",
    position: "Phụ trách pháp chế",
    email: "phapche.houston123@legal360.vn",
    phone: "0901234567",
    isPrimary: true,
    createdAt: opened,
    updatedAt: opened,
  };
  db.contacts.push(contact);

  // Gắn tài khoản khách hàng demo với tổ chức flagship để giới hạn truy cập.
  customer.orgId = org.id;

  const theCase: Case = {
    id: createId("case"),
    caseCode,
    orgId: org.id,
    primaryContactId: contact.id,
    status: "lawyer_analysis",
    package: "premium",
    assignedLawyerId: lawyer.id,
    reviewerId: null,
    intakeOwnerId: intake.id,
    openedAt: opened,
    slaDueAt: daysFromNow(5),
    createdAt: opened,
    updatedAt: daysAgo(1),
  };
  db.cases.push(theCase);

  db.surveyRequests.push({
    id: createId("sr"),
    caseId: theCase.id,
    payload: {
      companyName: org.name,
      taxCode: org.taxCode,
      scope: ["corporate", "labor", "tax", "ip", "commercial"],
      objectives: "Rà soát tổng thể rủi ro pháp lý trước vòng gọi vốn và mở rộng chương trình đào tạo.",
      contactName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
    },
    leadStatus: "lawyer_analysis",
    createdAt: opened,
    updatedAt: opened,
  });

  // Lịch sử trạng thái (happy path tới lawyer_reviewing).
  const path: { to: CaseStatus; ago: number; note?: string }[] = [
    { to: "lead_new", ago: 14, note: "Khách gửi phiếu yêu cầu khảo sát." },
    { to: "lead_verified", ago: 13 },
    { to: "conflict_checking", ago: 13 },
    { to: "conflict_cleared", ago: 12, note: "Không có xung đột lợi ích." },
    { to: "proposal_sent", ago: 12 },
    { to: "contract_pending", ago: 11 },
    { to: "payment_pending", ago: 10 },
    { to: "case_opened", ago: 8, note: "Sinh mã hồ sơ, tạo kho tài liệu Drive." },
    { to: "info_form_sent", ago: 8, note: "Gửi phiếu yêu cầu cung cấp thông tin cho khách hàng." },
    { to: "info_form_uploaded", ago: 7, note: "Khách đã upload phiếu đã điền và tài liệu nền." },
    { to: "online_meeting_scheduled", ago: 6, note: "Lên lịch họp online để hỏi chi tiết." },
    { to: "online_meeting_done", ago: 5, note: "Đã giải trình câu hỏi ban đầu và ghi nhận vấn đề khách nêu." },
    { to: "checklist_in_progress", ago: 5, note: "Cập nhật bộ checklist chi tiết theo nhóm vấn đề." },
    { to: "onsite_survey_scheduled", ago: 4, note: "Lên lịch khảo sát thực tế tại doanh nghiệp." },
    { to: "onsite_survey_done", ago: 3, note: "Ghi nhận kết quả khảo sát thực tế." },
    { to: "document_reviewing", ago: 3 },
    { to: "ocr_processing", ago: 3 },
    { to: "ai_classifying", ago: 3 },
    { to: "ai_analyzing", ago: 2 },
    { to: "lawyer_analysis", ago: 1, note: "Chuyển luật sư tổng hợp vấn đề, rủi ro và căn cứ pháp lý." },
  ];
  let prev: CaseStatus | null = null;
  for (const p of path) {
    db.caseStatusHistory.push({
      id: createId("hist"),
      caseId: theCase.id,
      fromStatus: prev,
      toStatus: p.to,
      changedById: p.to === "lawyer_reviewing" || p.to === "ai_analyzing" ? null : intake.id,
      note: p.note ?? null,
      createdAt: daysAgo(p.ago),
    });
    prev = p.to;
  }

  // Thương mại: conflict clear -> báo phí (accepted) -> hợp đồng (signed) -> tạm ứng đã thu.
  db.conflictChecks.push({
    id: createId("cf"),
    caseId: theCase.id,
    result: "clear",
    checkedById: intake.id,
    matchedAgainst: ["Tên doanh nghiệp", "MST", "Người đại diện"],
    note: "Đã đối chiếu, không phát hiện xung đột lợi ích.",
    createdAt: daysAgo(12),
  });
  const proposal: Proposal = {
    id: createId("prop"),
    caseId: theCase.id,
    code: "BP-20260606-01",
    package: "premium",
    amount: 25_000_000,
    vatAmount: 2_000_000,
    currency: "VND",
    status: "accepted",
    validUntil: daysFromNow(20),
    createdById: intake.id,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(11),
  };
  db.proposals.push(proposal);
  db.contracts.push({
    id: createId("ctr"),
    caseId: theCase.id,
    proposalId: proposal.id,
    code: "HD-20260607-01",
    templateVersion: "HD-DV-PHAP-LY-v1",
    status: "signed",
    signedDocumentId: createId("signed"),
    signedAt: daysAgo(10),
    createdById: intake.id,
    createdAt: daysAgo(11),
    updatedAt: daysAgo(10),
  } satisfies Contract);
  db.payments.push({
    id: createId("pay"),
    caseId: theCase.id,
    milestone: "deposit",
    amount: 13_500_000,
    method: "Chuyển khoản",
    status: "paid",
    paidAt: daysAgo(9),
    createdById: intake.id,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  } satisfies Payment);

  // Drive folders (root + 12 subfolder).
  const rootId = createId("fld");
  db.driveFolders.push({
    id: createId("drv"),
    caseId: theCase.id,
    driveFolderId: rootId,
    name: `${caseCode}_HOUSTON123`,
    parentFolderId: null,
    subfolderKey: null,
    status: "active",
    createdAt: opened,
    updatedAt: opened,
  });
  for (const sub of DRIVE_SUBFOLDERS) {
    db.driveFolders.push({
      id: createId("drv"),
      caseId: theCase.id,
      driveFolderId: createId("fld"),
      name: sub.name,
      parentFolderId: rootId,
      subfolderKey: sub.key,
      status: "active",
      createdAt: opened,
      updatedAt: opened,
    });
  }

  // Tài liệu mẫu.
  const sampleDocs: { cat: string; name: string }[] = [
    { cat: "01", name: "Gioi_thieu_doanh_nghiep.pdf" },
    { cat: "02", name: "GCN_dang_ky_doanh_nghiep.pdf" },
    { cat: "02", name: "Dieu_le_cong_ty.pdf" },
    { cat: "03", name: "BCTC_2025.pdf" },
    { cat: "04", name: "Hop_dong_lao_dong_mau.docx" },
  ];
  sampleDocs.forEach((d, i) => {
    const doc: DocumentRecord = {
      id: createId("doc"),
      caseId: theCase.id,
      categoryKey: d.cat,
      originalName: d.name,
      storedName: `${caseCode}_HOUSTON123_${d.cat}_${d.name}`,
      mimeType: d.name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
      sizeBytes: 800_000 + i * 120_000,
      driveFileId: createId("fil"),
      uploaderId: customer.id,
      status: "uploaded",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    };
    db.documents.push(doc);
  });

  // Findings: critical, high, medium + 1 cần bổ sung tài liệu.
  const findingSpecs: { code: string; group: string; title: string; risk: RiskLevel; status: LegalFinding["status"]; desc: string; rec: string; basis: string | null; evidence: string }[] = [
    {
      code: "F-01",
      group: "corporate",
      title: "Giấy chứng nhận đủ điều kiện hoạt động giáo dục chưa được cập nhật theo ngành nghề mới",
      risk: "critical",
      status: "ai_draft",
      desc: "Doanh nghiệp bổ sung ngành đào tạo lập trình nhưng chưa cập nhật giấy phép con tương ứng.",
      rec: "Rà soát điều kiện kinh doanh ngành giáo dục nghề nghiệp và xin cấp/điều chỉnh giấy phép.",
      basis: null,
      evidence: "GCN ĐKDN ghi nhận ngành nghề bổ sung nhưng thiếu giấy phép hoạt động giáo dục.",
    },
    {
      code: "F-02",
      group: "labor",
      title: "Hợp đồng lao động mẫu thiếu phụ lục mô tả công việc và thỏa thuận bảo mật",
      risk: "high",
      status: "ai_draft",
      desc: "Mẫu HĐLĐ đang dùng chưa có phụ lục công việc và điều khoản bảo mật/sở hữu trí tuệ cho nhân sự lập trình.",
      rec: "Bổ sung phụ lục công việc, điều khoản NDA và quyền sở hữu sản phẩm do người lao động tạo ra.",
      basis: "Bộ luật Lao động 2019, Điều 21",
      evidence: "Hop_dong_lao_dong_mau.docx không có phụ lục công việc.",
    },
    {
      code: "F-03",
      group: "tax",
      title: "Chưa có chính sách xuất hóa đơn cho học phí thu trước nhiều kỳ",
      risk: "medium",
      status: "lawyer_accepted",
      desc: "Khoản học phí thu trước cần xác định thời điểm ghi nhận doanh thu và xuất hóa đơn phù hợp.",
      rec: "Xây dựng quy trình ghi nhận doanh thu và xuất hóa đơn theo từng kỳ dịch vụ.",
      basis: "Nghị định 123/2020/NĐ-CP về hóa đơn, chứng từ",
      evidence: "BCTC_2025.pdf phản ánh khoản doanh thu chưa thực hiện lớn.",
    },
    {
      code: "F-04",
      group: "ip",
      title: "Cần bổ sung tài liệu đăng ký nhãn hiệu và bản quyền giáo trình",
      risk: "high",
      status: "checker_flagged",
      desc: "Chưa có tài liệu chứng minh quyền sở hữu trí tuệ đối với thương hiệu và giáo trình đào tạo.",
      rec: "Yêu cầu doanh nghiệp cung cấp giấy chứng nhận nhãn hiệu, hồ sơ bản quyền giáo trình (nếu có).",
      basis: null,
      evidence: "Chưa nhận được tài liệu SHTT trong nhóm 06.",
    },
  ];
  findingSpecs.forEach((f) => {
    const finding: LegalFinding = {
      id: createId("find"),
      caseId: theCase.id,
      code: f.code,
      groupKey: f.group,
      title: f.title,
      description: f.desc,
      riskLevel: f.risk,
      recommendation: f.rec,
      confidence: 0.74,
      status: f.status,
      needsLawyer: true,
      evidence: [
        { id: createId("ev"), findingId: "", documentId: null, snippet: f.evidence, legalBasis: f.basis },
      ],
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    };
    finding.evidence[0]!.findingId = finding.id;
    db.findings.push(finding);
  });

  // Báo cáo nháp.
  const report: Report = {
    id: createId("rep"),
    caseId: theCase.id,
    currentVersionId: null,
    status: "in_review",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  };
  db.reports.push(report);
  const draft: ReportVersion = {
    id: createId("rv"),
    reportId: report.id,
    version: 1,
    kind: "lawyer_draft",
    createdById: lawyer.id,
    createdAt: daysAgo(1),
  };
  db.reportVersions.push(draft);
  report.currentVersionId = draft.id;

  // Roadmap 30-90 ngày.
  const roadmap: Array<Omit<RoadmapItem, "id" | "caseId" | "createdAt" | "updatedAt">> = [
    { title: "Xin điều chỉnh giấy phép hoạt động giáo dục", phase: "d30", priority: "high", ownerRole: "lawyer", dueAt: daysFromNow(25), status: "open" },
    { title: "Chuẩn hóa hợp đồng lao động + phụ lục công việc/NDA", phase: "d30", priority: "high", ownerRole: "staff", dueAt: daysFromNow(28), status: "in_progress" },
    { title: "Thiết lập quy trình ghi nhận doanh thu & xuất hóa đơn học phí", phase: "d60", priority: "med", ownerRole: "accountant", dueAt: daysFromNow(55), status: "open" },
    { title: "Đăng ký nhãn hiệu và bản quyền giáo trình", phase: "d60", priority: "med", ownerRole: "lawyer", dueAt: daysFromNow(58), status: "open" },
    { title: "Ban hành quy chế quản trị nội bộ & tuân thủ", phase: "d90", priority: "low", ownerRole: "lawyer", dueAt: daysFromNow(85), status: "open" },
  ];
  for (const r of roadmap) {
    db.roadmapItems.push({ id: createId("road"), caseId: theCase.id, createdAt: opened, updatedAt: opened, ...r });
  }

  // Audit logs mẫu.
  db.auditLogs.push(
    {
      id: createId("aud"),
      actorId: intake.id,
      actorLabel: intake.fullName,
      action: "case.opened",
      entityType: "case",
      entityId: theCase.id,
      metadata: { caseCode },
      createdAt: opened,
    },
    {
      id: createId("aud"),
      actorId: null,
      actorLabel: "Hệ thống AI",
      action: "ai.analyzed",
      entityType: "case",
      entityId: theCase.id,
      metadata: { findings: findingSpecs.length },
      createdAt: daysAgo(2),
    },
    {
      id: createId("aud"),
      actorId: lawyer.id,
      actorLabel: lawyer.fullName,
      action: "finding.review",
      entityType: "case",
      entityId: theCase.id,
      metadata: { action: "accept", code: "F-03" },
      createdAt: daysAgo(1),
    },
  );
}
