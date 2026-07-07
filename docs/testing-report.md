# LEGAL360 — Testing Report

Cập nhật: 19/06/2026

## Tổng hợp

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ 0 lỗi (TS strict) |
| Lint | `npm run lint` | ✅ No ESLint warnings or errors |
| Unit/Integration | `npm run test` | ✅ **55 pass / 13 files** |
| Build | `npm run build` | ✅ 17 routes, static 17/17 |
| E2E browser | `npm run test:e2e` | ✅ **5 pass** (Chromium) |

## Vitest — bao phủ (13 files, 55 tests)

- `shared/status.test.ts` — state machine: transition hợp lệ/không hợp lệ, đủ meta 24 trạng thái.
- `shared/schemas.test.ts` — intake validation: thiếu email/SĐT/consent, sai định dạng, scope rỗng, MST sai.
- `server/services/case-code.test.ts` — mã `DN-YYYYMMDD-#####` đúng định dạng, 1000 mã không trùng, reset theo ngày.
- `server/services/report.test.ts` — evidence required, lawyer approval required, chỉ finding đã duyệt vào final.
- `server/services/workflow.test.ts` — transition + history + audit; chặn transition sai.
- `server/services/commercial.test.ts` — conflict clear/rejected, guard báo phí cần conflict clear, chuỗi đầy đủ + guard mở hồ sơ cần thanh toán.
- `server/services/e2e-flow.test.ts` — happy path intake→approve→roadmap; negative (mở khi chưa pay, upload sai định dạng, approve khi còn finding chưa duyệt, provider lỗi không crash).
- `server/services/ai-analysis.test.ts` — AI sinh finding có evidence, idempotent.
- `server/services/documents.test.ts` — upload metadata, đổi tên, chặn mime/oversize/category sai.
- `server/services/rbac.test.ts` — customer cross-tenant 403, list scoping, section guard, view-all.
- `server/services/persistence.test.ts` — document_versions, ai_runs, risk_scores, extracted_fields, lawyer_reviews, notifications, report_versions(final) được persist.
- `server/services/drive.test.ts` — Drive mock: 12 subfolder, rename/metadata/shareLink, failOnce, getDriveStatus=mock.
- `components/legal360/case-status-badge.test.tsx` — badge trạng thái/rủi ro.

## E2E browser (Playwright, 5 tests)

1. Landing đúng thương hiệu Luật Ngọc Sơn + hotline.
2. Mở phiếu đăng ký khảo sát.
3. Chưa đăng nhập vào /admin → redirect /login.
4. Đăng nhập Intake → vào workspace.
5. Đăng nhập Customer → cổng khách hàng thấy hồ sơ HOUSTON123.

## HTTP smoke (runtime, có auth thật) — bằng chứng guard

```
chưa login GET /api/leads        → 401
chưa login GET /portal           → 307 → /login
lead→conflict→proposal→contract→sign→payment→open  → DN-20260619-00001, Drive 12 subfolder
AI rà soát                        → 3 findings (có evidence)
intake duyệt report               → 403
lawyer duyệt → báo cáo final       → v2 (roadmap + notification sinh)
customer xem case org khác         → 403
```

## Cách chạy lại

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npm run test:e2e        # cần chạy 1 lần: npx playwright install chromium
```
