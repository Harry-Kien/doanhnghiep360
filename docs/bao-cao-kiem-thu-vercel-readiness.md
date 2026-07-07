# Bao cao kiem thu quy trinh va Vercel readiness - Legal360

Ngay kiem thu: 2026-07-07  
Moi truong: Windows local, Next.js 14, localhost `http://127.0.0.1:3002`, Supabase project `legal app`.

## 1. Ket luan dieu hanh

| Hang muc | Ket qua | Ghi chu |
|---|---:|---|
| Luong nghiep vu cot loi | PASS | Landing, dang ky, auth noi bo, admin, intake, case detail, lawyer va audit log da chay qua browser that. |
| UI/workspace theo vai tro | PASS | Anh chup Playwright cho 10 man hinh, khong trang trang, khong client exception, CSS/font tai dung. |
| Mock/nhan dien demo | PASS CO DIEU KIEN | Da bo nhan dien "mock" tren UI provider/settings. Test suite van dung adapter email local de kiem thu OTP, khong phai che do production. |
| Supabase | PARTIAL READY | Da tao schema private va migration tren Supabase; can `DATABASE_URL`/DB password de import day du va can refactor async repository truoc khi dung lam runtime DB tren Vercel. |
| Build/test code | PASS | Typecheck, lint, unit/integration 110/110, browser screenshot flow va production build deu pass. |
| Vercel preview | CO THE CHUAN BI | Code build duoc; can link Vercel project va set env that. |
| Vercel production live | CHUA GO-LIVE | Thieu secret Drive/SMTP/Gemini that va runtime store chua chuyen sang Supabase async live. |

Verdict: ung dung da san sang de ban test chi tiet tren localhost va commit len GitHub. Chua nen go-live Vercel voi khach that cho den khi dien du secret production va hoan tat runtime Supabase/Postgres live.

## 2. Bang chung kiem thu

| Gate | Ket qua |
|---|---|
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS - khong co warning/error ESLint |
| `npm.cmd test` | PASS - 22 files, 110 tests |
| `npm.cmd run build` | PASS - Next production build thanh cong, 27 static pages generated |
| Playwright screenshot flow | PASS - 10/10 man hinh, `problems: []` |
| `npm.cmd run check:env -- .env.production.example` | FAIL DUNG KY VONG - thieu secret that cua Drive, SMTP, Gemini; co canh bao runtime Supabase can refactor async |

## 3. Anh chup luong da kiem thu

Thu muc bang chung: `outputs/workflow-screenshots-final/`

| Buoc | Man hinh |
|---:|---|
| 01 | `01-landing.png` |
| 02 | `02-public-registration.png` |
| 03 | `03-staff-login.png` |
| 04 | `04-admin-dashboard.png` |
| 05 | `05-provider-status.png` |
| 06 | `06-admin-settings.png` |
| 07 | `07-intake-pipeline.png` |
| 08 | `08-case-detail-workflow.png` |
| 09 | `09-lawyer-workspace.png` |
| 10 | `10-audit-log.png` |

File `outputs/workflow-screenshots-final/verification.json` ghi ro:

- Base URL: `http://127.0.0.1:3002`
- CSS/font: `Be Vietnam Pro`
- Problems: `[]`

## 4. Supabase

Da cau hinh:

- Project: `legal app`
- Ref: `zmaihhisppgsvazbwqyg`
- URL: `https://zmaihhisppgsvazbwqyg.supabase.co`
- Migration: `legal360_snapshot_store`
- Schema: `legal360_private`
- Quyen truy cap: khong grant `anon`/`authenticated` vao schema private.

Da co trong repo:

- `supabase/migrations/202607070001_legal360_snapshot_store.sql`
- `scripts/push-store-to-supabase.mjs`
- `docs/supabase-setup.md`
- Env gate bat buoc `DATABASE_URL` khi `DATA_STORE=supabase`

Gioi han hien tai:

- MCP Supabase khong tra ve DB password/`DATABASE_URL`; can copy Transaction pooler connection string trong Supabase Dashboard.
- Snapshot Supabase da co mot phan du lieu, nhung chua du de go-live live DB.
- Runtime Legal360 hien van xoay quanh `getDb()/commit()` dong bo; Supabase/Postgres client can async repository.

## 5. Dieu kien truoc khi dua len Vercel production

Can set env production that:

- `APP_BASE_URL`
- `AUTH_SECRET`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `DATA_STORE=supabase`
- `DATABASE_URL`
- `DRIVE_PROVIDER=google`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `EMAIL_PROVIDER=smtp`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY`
- Google OAuth env neu bat dang nhap Google

Can hoan tat ky thuat:

- Refactor store/service layer sang async Supabase/Postgres runtime.
- Import lai day du snapshot local vao Supabase bang `npm run supabase:push-store`.
- Chay lai `check:env`, typecheck, lint, test, build va browser smoke tren domain Vercel.

## 6. Ket luan

Localhost hien tai dung de test chi tiet: `http://127.0.0.1:3002`.  
Code da build/test tot va du dieu kien commit/push.  
Vercel production live con can secret va runtime Supabase live truoc khi su dung that.
