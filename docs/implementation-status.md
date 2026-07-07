# Legal360 implementation status

Cap nhat: 2026-07-01.

## Da co

- Landing page, dang ky khao sat, customer portal.
- Auth nhan su bang email + mat khau tai `/nhan-vien`.
- Auth khach hang bang OTP/Google OAuth tai `/login`.
- Da xoa quick-login/demo session `/api/session`.
- RBAC theo vai tro: admin, intake, staff, lawyer/reviewer, accountant, customer.
- Admin dashboard, provider status, settings, audit, user management.
- Intake/case workflow theo state machine.
- Conflict check, proposal, contract, payment, open case.
- Upload tai lieu, checklist, version metadata, download tai lieu.
- Google Drive adapter mock/google; production can google.
- OCR adapter mock/local/gemini.
- AI adapter mock/gemini/llm.
- Lawyer finding review, report guard, final approval.
- Report download sinh DOCX/HTML that tu du lieu da tham dinh.
- SQLite persistence tai `.data/legal360.db`.
- Production seed sach: chi tao 1 admin master neu DB trong.

## Khong con

- Khong con `/api/session`.
- Khong con UI dang nhap nhanh demo.
- Khong con `RoleSwitcher` demo.
- Khong con report mock adapter rieng.

## Van can cau hinh truoc go-live

- Domain that cho `APP_BASE_URL`.
- SMTP that de gui OTP/email.
- Google Drive service account va root folder that.
- Gemini/LLM key that neu muon AI production.
- Admin master password manh.
- Backup `.data/legal360.db`.

## Gioi han con lai

- SQLite phu hop VPS/single instance; neu deploy serverless/multi-instance can Postgres/Prisma.
- Rate limit hien in-memory; multi-instance can Redis.
- CSRF token cho form ghi nen bo sung khi chay cong khai luu luong lon.
- 2FA nhan su chua co.
- OCR scan anh tot nhat khi cau hinh Gemini/OCR cloud.

## Kiem tra

Chay truoc deploy:

```bash
npm run check:env -- .env.production
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Khong ket luan production-ready neu `check:env`, build, hoac smoke flow that sau deploy chua pass.
