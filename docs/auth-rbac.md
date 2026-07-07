# Auth & RBAC

## Auth

- Session dung token HMAC-SHA256, cookie `legal360_session`, `httpOnly`, TTL 12 gio.
- Nhan su dang nhap tai `/nhan-vien` bang `POST /api/auth/login` voi email + mat khau.
- Khach hang dang nhap tai `/login` bang OTP email (`/api/auth/otp-login`, `/api/verify-otp`) hoac Google OAuth neu da cau hinh.
- Dang xuat qua `POST /api/auth/logout`.
- Lay thong tin session hien tai qua `GET /api/auth/me`.
- Da xoa quick-login/demo session `/api/session`; khong con duong tat dang nhap theo vai tro.

## Production seed

Khi DB trong va `NODE_ENV=production`, he thong chi tao 1 admin master:

- email: `ADMIN_EMAIL` hoac mac dinh `admin@legal360.vn`
- mat khau: `ADMIN_PASSWORD` hoac mac dinh tam thoi `Legal360@Admin`

Khong seed ho so mau, khong seed tai khoan demo, khong seed customer demo. Admin master dang nhap `/nhan-vien`, sau do vao Admin -> Quan ly nguoi dung de tao nhan su that.

## Local/dev seed

Local/dev van co seed data de test luong:

| Vai tro | Email | Mat khau |
|---|---|---|
| Admin | `admin@legal360.vn` | `legal360` |
| Intake | `intake@legal360.vn` | `legal360` |
| Lawyer | `lawyer@legal360.vn` | `legal360` |
| Reviewer | `reviewer@legal360.vn` | `legal360` |
| Staff | `staff@legal360.vn` | `legal360` |
| Accountant | `accountant@legal360.vn` | `legal360` |
| Customer | `khach@legal360.vn` | `legal360` |

Day chi la du lieu local/test. Thu muc `.data/` khong duoc commit va khong dung lam production database.

## RBAC

- `admin`: toan quyen van hanh, cau hinh provider, quan ly nguoi dung, audit.
- `intake`: tiep nhan lead, conflict check, bao phi, hop dong, mo ho so.
- `staff`: kiem tra tai lieu, checklist, OCR/evidence.
- `lawyer` / `reviewer`: duyet finding, tao/duyet bao cao, khoa ban final.
- `accountant`: theo doi bao phi, hop dong, thanh toan, ban giao.
- `customer`: chi xem ho so thuoc organization cua minh, upload tai lieu, xem bao cao/roadmap.

Middleware chuyen huong:

- Khu noi bo `/admin`, `/intake`, `/lawyer`, `/ke-toan`, `/cases` neu chua dang nhap -> `/nhan-vien`.
- Cong khach `/portal` neu chua dang nhap -> `/login`.

Kiem chung bang test: `src/server/services/rbac.test.ts`, `src/server/services/seed.test.ts`, `e2e/smoke.spec.ts`.
