// Data store: Database in-memory (đọc/ghi đồng bộ) + lớp bền vững SQLite (ACID).
// Mirror prisma/schema.prisma (schema.prisma là model chuẩn; runtime dùng SQLite qua better-sqlite3).
// Singleton qua globalThis để tránh tạo nhiều bản (và mở nhiều handle SQLite) khi Next.js hot-reload.
//   - DATA_STORE="memory"        -> chỉ in-memory (dùng cho test)
//   - DATA_STORE="sqlite"|"file" -> bền vững vào .data/legal360.db
//   - DATA_STORE="supabase"      -> cấu hình đích Supabase; cần async repository refactor trước khi làm runtime chính
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { openSqlite, type SqliteBackend } from "@/server/db/sqlite";
import type {
  AuditLog,
  Case,
  CaseStatusHistory,
  AiRun,
  ConflictCheck,
  Contact,
  Contract,
  DocumentRecord,
  DocumentVersion,
  DriveFolder,
  ExtractedField,
  LawyerReview,
  LegalFinding,
  Notification,
  Organization,
  OtpChallenge,
  Payment,
  Proposal,
  Report,
  ReportVersion,
  RiskScore,
  RoadmapItem,
  SurveyAnswer,
  SurveyMinute,
  SurveyPlan,
  SurveyRequest,
  SurveySession,
  User,
} from "@/shared/types";

export interface Database {
  users: User[];
  organizations: Organization[];
  contacts: Contact[];
  cases: Case[];
  caseStatusHistory: CaseStatusHistory[];
  conflictChecks: ConflictCheck[];
  proposals: Proposal[];
  contracts: Contract[];
  payments: Payment[];
  surveyRequests: SurveyRequest[];
  driveFolders: DriveFolder[];
  documents: DocumentRecord[];
  documentVersions: DocumentVersion[];
  surveyPlans: SurveyPlan[];
  surveySessions: SurveySession[];
  surveyMinutes: SurveyMinute[];
  surveyAnswers: SurveyAnswer[];
  aiRuns: AiRun[];
  extractedFields: ExtractedField[];
  findings: LegalFinding[];
  riskScores: RiskScore[];
  lawyerReviews: LawyerReview[];
  reports: Report[];
  reportVersions: ReportVersion[];
  roadmapItems: RoadmapItem[];
  notifications: Notification[];
  otpChallenges: OtpChallenge[];
  auditLogs: AuditLog[];
  /** counter cho mã hồ sơ theo ngày: { "20260618": 3 } */
  caseCodeCounters: Record<string, number>;
  /** Cấu hình runtime (key/provider) cài qua Admin — override biến môi trường. */
  settings: Record<string, string>;
  meta: { seeded: boolean };
}

export function emptyDb(): Database {
  return {
    users: [],
    organizations: [],
    contacts: [],
    cases: [],
    caseStatusHistory: [],
    conflictChecks: [],
    proposals: [],
    contracts: [],
    payments: [],
    surveyRequests: [],
    driveFolders: [],
    documents: [],
    documentVersions: [],
    surveyPlans: [],
    surveySessions: [],
    surveyMinutes: [],
    surveyAnswers: [],
    aiRuns: [],
    extractedFields: [],
    findings: [],
    riskScores: [],
    lawyerReviews: [],
    reports: [],
    reportVersions: [],
    roadmapItems: [],
    notifications: [],
    otpChallenges: [],
    auditLogs: [],
    caseCodeCounters: {},
    settings: {},
    meta: { seeded: false },
  };
}

const DATA_DIR = path.join(process.cwd(), ".data");
const SQLITE_FILE = path.join(DATA_DIR, "legal360.db");
const LEGACY_JSON = path.join(DATA_DIR, "db.json");

/** Có bền vững xuống đĩa không? (mọi giá trị khác "memory" đều persist). */
const isPersistent = env.dataStore !== "memory";

interface StoreHolder {
  db: Database;
  backend: SqliteBackend | null;
}

const globalForStore = globalThis as unknown as { __legal360Store?: StoreHolder };

/** Nạp 1 lần dữ liệu cũ từ .data/db.json (file store đời đầu) vào SQLite, rồi đổi tên để không import lại. */
function migrateLegacyJson(backend: SqliteBackend): void {
  if (!backend.isEmpty() || !fs.existsSync(LEGACY_JSON)) return;
  try {
    const raw = fs.readFileSync(LEGACY_JSON, "utf8");
    const legacy = { ...emptyDb(), ...(JSON.parse(raw) as Partial<Database>) } as Database;
    backend.persist(legacy);
    fs.renameSync(LEGACY_JSON, `${LEGACY_JSON}.migrated`);
  } catch {
    // Không chặn khởi động nếu file legacy hỏng — bỏ qua, dùng DB rỗng/seed.
  }
}

function initStore(): StoreHolder {
  if (!isPersistent) return { db: emptyDb(), backend: null };
  if (["supabase", "postgres", "postgresql"].includes(env.dataStore)) {
    throw new Error(
      "DATA_STORE=supabase is configured, but the current Legal360 runtime store is still synchronous. " +
        "Use scripts/push-store-to-supabase.mjs for snapshot migration now, then refactor getDb()/commit() to an async Supabase repository before Vercel production.",
    );
  }
  try {
    const backend = openSqlite(SQLITE_FILE);
    migrateLegacyJson(backend);
    return { db: backend.load(emptyDb()), backend };
  } catch {
    // Nếu SQLite không khả dụng vì lý do nào đó, fallback in-memory để app vẫn chạy.
    return { db: emptyDb(), backend: null };
  }
}

const holder: StoreHolder = globalForStore.__legal360Store ?? initStore();
if (!globalForStore.__legal360Store) globalForStore.__legal360Store = holder;

/** Truy cập database (đã seed nếu cần — seed chạy lazy ở getDb). */
export function rawDb(): Database {
  return holder.db;
}

/** Lưu thay đổi xuống SQLite (atomic). No-op khi dùng memory store. */
export function commit(): void {
  if (holder.backend) holder.backend.persist(holder.db);
}

/** Chỉ dùng cho test: reset toàn bộ store (in-memory + bền vững nếu có). */
export function __resetStore(): void {
  holder.db = emptyDb();
  if (holder.backend) holder.backend.persist(holder.db);
}
