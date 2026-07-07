# Legal360 provider readiness

Trang chan doan runtime: `/admin/providers`.

## Provider co adapter

| Hang muc | Local/dev | Production |
|---|---|---|
| Google Drive | `DRIVE_PROVIDER=mock` de test nhanh | `DRIVE_PROVIDER=google` + service account + root folder |
| Email OTP | `EMAIL_PROVIDER=mock` chi dung local | `EMAIL_PROVIDER=smtp` + SMTP credentials |
| OCR | `OCR_PROVIDER=mock` hoac `local` | `OCR_PROVIDER=local` hoac provider OCR that |
| AI analysis | `AI_PROVIDER=mock` local | `AI_PROVIDER=gemini` hoac `llm` + API key |
| Google OAuth | optional | optional, can cau hinh neu muon khach dang nhap Google |

## Bao cao

Bao cao final khong con dung report mock adapter. Sau khi luat su duyet final, route download sinh file that theo du lieu da tham dinh:

- DOCX: `/api/cases/:id/report/download?format=docx`
- HTML/in PDF: `/api/cases/:id/report/download?format=html`

Quy tac bat buoc van duoc giu trong `src/server/services/report.ts`:

- finding phai duoc luat su duyet;
- finding final phai co evidence;
- khong export final khi chua co lawyer approval.

## Google Drive real

Can cau hinh:

```env
DRIVE_PROVIDER=google
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=<folder-id>
GOOGLE_SHARED_DRIVE_ID=<optional>
```

Share folder goc hoac Shared Drive cho service account voi quyen Editor.

## Production gate

Truoc deploy:

```bash
npm run check:env -- .env.production
```

Lenh nay phai pass. Neu provider bat buoc con mock/thieu key, chua du dieu kien go-live.
