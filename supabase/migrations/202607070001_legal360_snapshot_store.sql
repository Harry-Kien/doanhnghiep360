-- Legal360 Supabase snapshot store.
-- This schema is intentionally private: the Next.js backend connects with DATABASE_URL.
-- Do not expose these tables to the Supabase Data API unless a separate RLS design is added.

create schema if not exists legal360_private;

create table if not exists legal360_private.collection_records (
  collection_key text not null,
  id text not null,
  case_id text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection_key, id)
);

create index if not exists collection_records_case_idx
  on legal360_private.collection_records (collection_key, case_id);

create table if not exists legal360_private.kv (
  k text primary key,
  v jsonb not null,
  updated_at timestamptz not null default now()
);

revoke all on schema legal360_private from anon, authenticated;
revoke all on all tables in schema legal360_private from anon, authenticated;

