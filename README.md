# Legal360 - Khao sat Phap ly Doanh nghiep 360

He thong van hanh dich vu khao sat phap ly doanh nghiep cho cong ty luat:
landing/dang ky -> gui phieu yeu cau thong tin -> khach upload phieu/tai lieu -> hop online -> checklist chi tiet -> khao sat thuc te -> tong hop/AI ho tro -> luat su phan tich -> bao cao du thao -> giai trinh/chinh sua -> reviewer duyet -> ban giao final -> de xuat retainer/roadmap.

Source of truth nghiep vu:

- `legal360-implementation-blueprint.md`
- `legal360-bpmn-workflow.mmd`
- `docs/`

## Trang thai hien tai

- Auth noi bo dung email + mat khau qua `/nhan-vien`.
- Khach hang dang nhap qua OTP/Google tai `/login`.
- Khong con quick-login/demo session `/api/session`.
- Production seed sach: chi tao 1 admin master, khong ho so mau, khong tai khoan demo.
- Local/dev van co seed data de test luong, nhung `.data/` khong duoc commit.
- Google Drive, SMTP, OCR, AI co adapter that; production check bat buoc cau hinh provider that.

## Chay local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mo `http://localhost:3000`.

Tai khoan seed local dung de test:

| Vai tro | Email | Mat khau |
|---|---|---|
| Admin | `admin@legal360.vn` | `legal360` |
| Intake | `intake@legal360.vn` | `legal360` |
| Lawyer | `lawyer@legal360.vn` | `legal360` |
| Reviewer | `reviewer@legal360.vn` | `legal360` |
| Staff | `staff@legal360.vn` | `legal360` |
| Accountant | `accountant@legal360.vn` | `legal360` |
| Customer | `khach@legal360.vn` | `legal360` |

Nhan su dang nhap tai `/nhan-vien`; khach hang dang nhap tai `/login`.

Mau phieu khach hang tai trong portal:

- `/templates/phieu-yeu-cau-cung-cap-thong-tin-doanh-nghiep-360.docx`

## Deploy production

Khuyen nghi go-live nhanh: VPS/may chu rieng co dia ben vung neu tiep tuc dung SQLite tai `.data/legal360.db`.

Neu deploy len Vercel/serverless, cau hinh Supabase/Postgres theo `docs/supabase-setup.md` va dat `DATA_STORE=supabase`, `DATABASE_URL=<Supabase Transaction pooler URL>`.

Truoc khi deploy:

```bash
npm run check:env -- .env.production
npm run typecheck
npm run lint
npm run test
npm run build
```

Production bat buoc:

- `APP_BASE_URL=https://<domain-that>`
- `AUTH_SECRET` manh, 32+ ky tu
- `ADMIN_EMAIL` va `ADMIN_PASSWORD` that
- `DRIVE_PROVIDER=google` + Google service account/root folder
- `EMAIL_PROVIDER=smtp` + SMTP credentials
- `OCR_PROVIDER=local` hoac provider OCR that
- `AI_PROVIDER=gemini` hoac `llm` + API key
- khong dat `SEED_DEMO=true` khi go-live
- admin master mac dinh trong production la `Ths-Ls. Ly Ngoc Son` theo `ADMIN_EMAIL` / `ADMIN_PASSWORD`

Chi tiet: `docs/deploy.md`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run check:env -- .env.production
npm run supabase:push-store
```

## Kien truc

```text
src/
  app/                 Next.js App Router, pages va API route handlers
  components/          UI, auth, dashboard, legal360 widgets
  lib/                 auth/session/env/http/rate-limit utilities
  server/
    adapters/          Drive, OCR, AI, email adapters
    db/                SQLite-backed runtime store
    services/          workflow, cases, documents, report, users, seed
  shared/              roles, status machine, schemas, DTOs, constants
docs/                  deploy, workflow, QA, implementation status
prisma/schema.prisma   schema tham chieu khi chuyen Postgres
```

Nguyen tac bat bien: AI chi ho tro, luat su duyet cuoi; finding phai co evidence; khong export final khi chua lawyer approval; moi hanh dong quan trong co audit log; khach chi thay ho so cua minh.
