// Durable SQLite backend (synchronous, ACID) cho data store.
// Mỗi collection = 1 bảng (id PK + case_id index + cột data JSON). Singleton lưu ở bảng kv.
// Thiết kế: app vẫn đọc/ghi trên Database in-memory (đồng bộ); SQLite là lớp bền vững:
//   - load(): nạp toàn bộ rows -> Database khi khởi động
//   - persist(db): ghi toàn bộ state trong 1 transaction (atomic, chống hỏng file) mỗi commit()
// Lý do dùng better-sqlite3 (đồng bộ) thay vì Prisma (async): toàn bộ service hiện đồng bộ
// (getDb()/commit()), nên giữ đồng bộ là phương án ổn định & ít rủi ro nhất.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Database as Db } from "@/server/db/store";

/** Các collection được persist (khớp key của interface Database). */
export const COLLECTION_KEYS = [
  "users",
  "organizations",
  "contacts",
  "cases",
  "caseStatusHistory",
  "conflictChecks",
  "proposals",
  "contracts",
  "payments",
  "surveyRequests",
  "driveFolders",
  "documents",
  "documentVersions",
  "surveyPlans",
  "surveySessions",
  "surveyMinutes",
  "surveyAnswers",
  "aiRuns",
  "extractedFields",
  "findings",
  "riskScores",
  "lawyerReviews",
  "reports",
  "reportVersions",
  "roadmapItems",
  "notifications",
  "otpChallenges",
  "auditLogs",
] as const;

type CollectionKey = (typeof COLLECTION_KEYS)[number];

export interface SqliteBackend {
  /** Nạp toàn bộ dữ liệu vào `target` (thường là emptyDb()) và trả về. */
  load(target: Db): Db;
  /** Ghi toàn bộ state xuống SQLite trong 1 transaction (atomic). */
  persist(db: Db): void;
  /** DB chưa có dữ liệu (dùng để quyết định migrate legacy / seed). */
  isEmpty(): boolean;
  close(): void;
  readonly filePath: string;
}

export function openSqlite(filePath: string): SqliteBackend {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sdb = new Database(filePath);
  // WAL: bền hơn khi crash, cho phép đọc đồng thời. NORMAL: cân bằng an toàn/tốc độ.
  sdb.pragma("journal_mode = WAL");
  sdb.pragma("synchronous = NORMAL");

  const ddl: string[] = [];
  for (const k of COLLECTION_KEYS) {
    ddl.push(`CREATE TABLE IF NOT EXISTS "${k}" (id TEXT PRIMARY KEY, case_id TEXT, data TEXT NOT NULL);`);
    ddl.push(`CREATE INDEX IF NOT EXISTS "idx_${k}_case" ON "${k}"(case_id);`);
  }
  ddl.push(`CREATE TABLE IF NOT EXISTS "kv" (k TEXT PRIMARY KEY, v TEXT NOT NULL);`);
  sdb.exec(ddl.join("\n"));

  type Stmt = Database.Statement;
  const selectStmt: Record<string, Stmt> = {};
  const deleteStmt: Record<string, Stmt> = {};
  const insertStmt: Record<string, Stmt> = {};
  for (const k of COLLECTION_KEYS) {
    selectStmt[k] = sdb.prepare(`SELECT data FROM "${k}"`);
    deleteStmt[k] = sdb.prepare(`DELETE FROM "${k}"`);
    insertStmt[k] = sdb.prepare(`INSERT INTO "${k}" (id, case_id, data) VALUES (@id, @case_id, @data)`);
  }
  const kvSelect = sdb.prepare(`SELECT k, v FROM "kv"`);
  const kvUpsert = sdb.prepare(`INSERT INTO "kv" (k, v) VALUES (@k, @v) ON CONFLICT(k) DO UPDATE SET v = excluded.v`);

  function load(target: Db): Db {
    for (const k of COLLECTION_KEYS) {
      const rows = selectStmt[k].all() as Array<{ data: string }>;
      (target as unknown as Record<string, unknown[]>)[k] = rows.map((r) => JSON.parse(r.data));
    }
    for (const { k, v } of kvSelect.all() as Array<{ k: string; v: string }>) {
      if (k === "caseCodeCounters") target.caseCodeCounters = JSON.parse(v);
      else if (k === "settings") target.settings = JSON.parse(v);
      else if (k === "meta") target.meta = JSON.parse(v);
    }
    return target;
  }

  const persistTx = sdb.transaction((db: Db) => {
    for (const k of COLLECTION_KEYS) {
      deleteStmt[k].run();
      const rows = (db as unknown as Record<string, Array<{ id: string; caseId?: string | null }>>)[k] ?? [];
      const ins = insertStmt[k];
      for (const row of rows) {
        ins.run({ id: row.id, case_id: row.caseId ?? null, data: JSON.stringify(row) });
      }
    }
    kvUpsert.run({ k: "caseCodeCounters", v: JSON.stringify(db.caseCodeCounters) });
    kvUpsert.run({ k: "settings", v: JSON.stringify(db.settings ?? {}) });
    kvUpsert.run({ k: "meta", v: JSON.stringify(db.meta) });
  });

  function persist(db: Db): void {
    persistTx(db);
  }

  const countUsers: Stmt = sdb.prepare(`SELECT count(*) AS c FROM "users"`);
  const metaProbe: Stmt = sdb.prepare(`SELECT v FROM "kv" WHERE k = 'meta'`);
  function isEmpty(): boolean {
    const usersCount = (countUsers.get() as { c: number }).c;
    return usersCount === 0 && !metaProbe.get();
  }

  function close(): void {
    sdb.close();
  }

  return { load, persist, isEmpty, close, filePath };
}

export type { CollectionKey };
