// Push the current Legal360 SQLite snapshot into Supabase Postgres.
//
// Usage:
//   DATABASE_URL="postgres://..." npm run supabase:push-store
//   node scripts/push-store-to-supabase.mjs --db .data/legal360.db
//
// The target schema is private and app-server-only. This script does not expose
// tables to Supabase REST/Data API.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";
import postgres from "postgres";

const COLLECTION_KEYS = [
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
];

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const sqliteFile = path.resolve(argValue("--db", path.join(".data", "legal360.db")));
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL. Copy the Supabase Transaction pooler connection string into DATABASE_URL.");
  process.exit(1);
}

if (!fs.existsSync(sqliteFile)) {
  console.error(`SQLite file not found: ${sqliteFile}`);
  process.exit(1);
}

const source = new Database(sqliteFile, { readonly: true });
const sql = postgres(connectionString, {
  ssl: "require",
  prepare: false,
  max: 1,
});

try {
  await sql.begin(async (tx) => {
    await tx`create schema if not exists legal360_private`;
    await tx`
      create table if not exists legal360_private.collection_records (
        collection_key text not null,
        id text not null,
        case_id text,
        data jsonb not null,
        updated_at timestamptz not null default now(),
        primary key (collection_key, id)
      )
    `;
    await tx`
      create index if not exists collection_records_case_idx
      on legal360_private.collection_records (collection_key, case_id)
    `;
    await tx`
      create table if not exists legal360_private.kv (
        k text primary key,
        v jsonb not null,
        updated_at timestamptz not null default now()
      )
    `;
    await tx`revoke all on schema legal360_private from anon, authenticated`;
    await tx`revoke all on all tables in schema legal360_private from anon, authenticated`;

    await tx`delete from legal360_private.collection_records`;
    await tx`delete from legal360_private.kv`;

    let recordCount = 0;
    for (const key of COLLECTION_KEYS) {
      const rows = source.prepare(`select id, case_id, data from "${key}"`).all();
      for (const row of rows) {
        await tx`
          insert into legal360_private.collection_records (collection_key, id, case_id, data)
          values (${key}, ${row.id}, ${row.case_id}, ${JSON.parse(row.data)})
        `;
        recordCount += 1;
      }
    }

    const kvRows = source.prepare(`select k, v from "kv"`).all();
    for (const row of kvRows) {
      await tx`
        insert into legal360_private.kv (k, v)
        values (${row.k}, ${JSON.parse(row.v)})
      `;
    }

    console.log(`Pushed ${recordCount} records and ${kvRows.length} kv rows to Supabase.`);
  });
} finally {
  source.close();
  await sql.end();
}

