# Legal360 - Deploy go-live

Cap nhat: 2026-07-01.

Tai lieu nay danh cho ban chay that voi khach hang va nhan vien, khong dung demo shortcut.

## 1. Chon noi deploy

He thong hien dung SQLite (`better-sqlite3`) tai `.data/legal360.db`.

| Noi deploy | Trang thai | Ghi chu |
|---|---|---|
| VPS / may chu rieng co dia ben vung | Dung duoc ngay | Khuyen nghi go-live nhanh |
| Vercel / serverless | Dung Supabase/Postgres | Khong dung SQLite file; xem `docs/supabase-setup.md` |

Khong dua `.data/` dev len production. Production khoi dong DB trong se chi tao 1 admin master ten `Ths-Ls. Ly Ngoc Son`.

## 2. Secret bat buoc xoay moi

Truoc khi go-live, tao moi:

- Google service account key
- SMTP/Gmail app password
- Gemini/LLM API key
- Google OAuth client secret
- `AUTH_SECRET` 32+ ky tu
- `ADMIN_PASSWORD` manh

Khong commit `.env`, `.env.local`, `.env.production`.

## 3. Bien moi truong production

Bat buoc:

| Bien | Gia tri |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | `Legal360 - Ngoc Son & Partners` |
| `APP_BASE_URL` | `https://<domain-that>` |
| `AUTH_SECRET` | chuoi ngau nhien 32+ ky tu |
| `ADMIN_EMAIL` | email admin master |
| `ADMIN_PASSWORD` | mat khau admin master manh |
| `DATA_STORE` | `supabase` neu deploy Vercel; `sqlite` neu deploy VPS |
| `DATABASE_URL` | Supabase Transaction pooler connection string |
| `DRIVE_PROVIDER` | `google` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | service account Drive |
| `GOOGLE_PRIVATE_KEY` | private key JSON moi |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | folder goc ho so |
| `EMAIL_PROVIDER` | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` | SMTP host / port |
| `SMTP_USER` / `SMTP_PASS` | tai khoan gui mail + app password |
| `OCR_PROVIDER` | `local` hoac provider OCR that |
| `AI_PROVIDER` | `gemini` hoac `llm` |
| `GEMINI_API_KEY` hoac `ANTHROPIC_API_KEY` | API key that |

Tuy chon:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=https://<domain>/api/auth/google/callback`
- `GOOGLE_SHARED_DRIVE_ID`
- `GOOGLE_SHEET_ID`

Khong dat `SEED_DEMO=true` khi go-live. Bien nay chi dung neu can trinh dien tren moi truong rieng.

Tai khoan nhan su thuc te phai duoc tao/quan tri trong `/admin/users`. Local seed co san doi ngu Ngoc Son & Partners de test role admin, reviewer, lawyer, staff, intake va accountant; production seed khong tao ho so mau.

## 4. Kiem tra env truoc deploy

```bash
npm run check:env -- .env.production
```

Lenh nay phai pass truoc khi deploy. No se chan cac loi nhu provider con mock, thieu Drive/SMTP/AI key, hoac `APP_BASE_URL` con localhost.

Neu dung Supabase, chay them:

```bash
npm run supabase:push-store
```

Chi tiet: `docs/supabase-setup.md`.

## 5. Build va test

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Neu can test browser:

```bash
npm run test:e2e
```

## 6. Deploy VPS khuyen nghi

```bash
git clone <repo> /var/www/legal360
cd /var/www/legal360
npm ci
nano .env.production
npm run check:env -- .env.production
cp .env.production .env
npm run build
mkdir -p .data
npm i -g pm2
pm2 start "npm run start" --name legal360
pm2 startup
pm2 save
```

Nginx:

```nginx
server {
  server_name <domain-that>;
  client_max_body_size 30M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Bat HTTPS:

```bash
sudo certbot --nginx -d <domain-that>
```

## 7. Smoke test sau deploy

- Dang nhap admin master tai `/nhan-vien`.
- Tao tai khoan nhan su that trong Admin -> Quan ly nguoi dung.
- Dang ky 1 ho so khach hang moi.
- Khach nhan OTP qua email that va dang nhap `/login`.
- Khach tai phieu yeu cau cung cap thong tin tai `/templates/phieu-yeu-cau-cung-cap-thong-tin-doanh-nghiep-360.docx`, dien xong va upload lai qua portal.
- Intake xu ly conflict, bao phi, hop dong, thanh toan, mo ho so.
- Len lich hop online, cap nhat checklist hoi chi tiet, len lich khao sat thuc te neu can.
- Upload 1 tai lieu va kiem tra file len Google Drive that.
- Chay OCR/AI, tao finding, luat su duyet.
- Tao bao cao du thao, gui khach, giai trinh/chinh sua, reviewer duyet final, ban giao qua portal.
- Kiem tra `/admin/providers` khong con provider bat buoc o mode mock.

## 8. Van hanh

- Backup `.data/legal360.db` hang ngay.
- Backup Google Drive folder ho so theo chinh sach noi bo.
- Theo doi SMTP quota va Gemini/LLM quota.
- Khi can scale nhieu instance: chuyen SQLite sang Postgres/Prisma truoc.
