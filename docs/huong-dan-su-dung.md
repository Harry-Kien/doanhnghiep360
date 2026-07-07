# Huong dan su dung Legal360

## 1. Vai tro

- `admin`: quan tri toan he thong, tao/sua/khoa tai khoan nhan su, cau hinh provider, xem audit.
- `intake`: tiep nhan lead, conflict check, bao phi, hop dong, thanh toan, mo ho so.
- `staff`: checklist tai lieu, OCR, chuan hoa evidence.
- `lawyer` / `reviewer`: duyet finding, tao/duyet bao cao, khoa final.
- `accountant`: theo doi hop dong, thanh toan, ban giao.
- `customer`: xem portal, upload tai lieu, tai bao cao da duyet.

## 2. Dang nhap

- Nhan su: `/nhan-vien`, dung email + mat khau.
- Khach hang: `/login`, dung OTP qua email hoac Google OAuth neu da cau hinh.
- Khong con dang nhap nhanh demo/doi vai tro demo.

## 3. Khoi dong production sach

Khi DB trong va `NODE_ENV=production`, he thong chi tao 1 admin master tu:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Admin dang nhap `/nhan-vien`, sau do vao Admin -> Quan ly nguoi dung de tao tai khoan nhan su that.

## 4. Luong hoat dong chuan

1. Khach dang ky khao sat tai `/dang-ky`.
2. Intake xac thuc lead va chay conflict check.
3. Intake gui bao phi/hop dong.
4. Ke toan/intake xac nhan thanh toan.
5. He thong mo ho so, sinh ma ho so va tao cau truc Drive.
6. Khach upload tai lieu trong portal.
7. Staff kiem tra checklist, OCR, evidence.
8. AI phan tich finding nhap.
9. Luat su/reviewer duyet finding.
10. Luat su tao va duyet bao cao final.
11. Khach tai bao cao, xem roadmap 30-90 ngay.

## 5. Luu y production

- Khong dung `SEED_DEMO=true` khi go-live.
- Khong dua `.data/` local len server that.
- Cau hinh Drive/SMTP/AI that va chay `npm run check:env -- .env.production`.
- Backup `.data/legal360.db` hang ngay neu deploy VPS/SQLite.
- Neu can deploy serverless/Vercel, chuyen sang Postgres/Prisma truoc.
