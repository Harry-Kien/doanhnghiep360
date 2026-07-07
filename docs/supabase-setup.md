# Cau hinh Supabase cho Legal360

Cap nhat: 2026-07-07.

## Trang thai ket noi hien tai

- Supabase project: `legal app`
- Project ref: `zmaihhisppgsvazbwqyg`
- Project URL: `https://zmaihhisppgsvazbwqyg.supabase.co`
- Migration da apply: `legal360_snapshot_store`
- Schema private: `legal360_private`
- `anon` va `authenticated` khong duoc grant vao schema private nay.

Luu y quan trong: MCP Supabase khong tra ve database password/`DATABASE_URL`. De app chay live tren Vercel hoac de day snapshot tu may local bang script, can copy Transaction pooler connection string tu Supabase Dashboard va dat vao bien `DATABASE_URL`.

## Muc tieu

Supabase se la database ben vung de thay cho `.data/legal360.db` khi dua he thong len Vercel/serverless. Tai thoi diem nay repo da co:

- Migration SQL tao schema private `legal360_private`.
- Script day snapshot hien tai tu SQLite len Supabase.
- Production env gate bat buoc `DATABASE_URL` khi chon `DATA_STORE=supabase`.

## 1. Tao project Supabase

1. Vao Supabase Dashboard va tao project moi.
2. Mo nut **Connect** trong project.
3. Neu deploy Vercel/serverless, copy **Transaction pooler** connection string, port `6543`.
4. Dien password database vao connection string.
5. Luu vao env:

```bash
DATABASE_URL="postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
DATA_STORE="supabase"
```

Khong dat `DATABASE_URL` vao bien `NEXT_PUBLIC_*`.

## 2. Tao schema tren Supabase

Chay SQL trong Supabase SQL Editor:

```sql
-- copy noi dung file supabase/migrations/202607070001_legal360_snapshot_store.sql
```

Schema mac dinh la `legal360_private`, khong expose ra Data API. App backend ket noi bang `DATABASE_URL`.

## 3. Day du lieu local hien co len Supabase

Neu may dang co `.data/legal360.db`, chay:

```bash
$env:DATABASE_URL="postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
npm run supabase:push-store
```

Script se:

- Doc toan bo bang runtime SQLite hien tai.
- Tao schema/table neu chua co.
- Xoa snapshot cu trong Supabase.
- Insert lai collection records va kv settings/counters/meta.

## 4. Production gate

Truoc khi deploy:

```bash
npm run check:env -- .env.production
```

Neu `DATA_STORE=supabase` ma thieu `DATABASE_URL`, lenh nay se fail.

## 5. Viec con lai de Vercel production dung Supabase 100%

Runtime hien tai cua Legal360 van la service layer dong bo quanh `getDb()/commit()`. Supabase/Postgres client chinh thong la async. Vi vay, de app chay production tren Vercel bang Supabase truc tiep, can mot refactor rieng:

1. Doi repository/store tu sync sang async.
2. Doi cac service mutating sang `async` va `await commit`.
3. Doi server components/API routes goi service thanh `await`.
4. Chay lai full test va browser smoke.

Cho den khi refactor nay hoan tat, Supabase da duoc cau hinh de nhan snapshot/backup du lieu, nhung chua nen xem la runtime database duy nhat cho Vercel production.
