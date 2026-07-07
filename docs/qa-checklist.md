# LEGAL360 — QA Checklist

Trạng thái: ✅ có test/được kiểm trong MVP · 🟡 thủ công/manual · ⬜ phase sau.

## A. Landing page
- ✅ Render đủ 8 section (hero, quy trình, phạm vi, kết quả, khác biệt, pricing, FAQ, CTA cuối).
- ✅ Không text overflow ở desktop & mobile (test viewport 375 / 768 / 1440).
- 🟡 Không console error khi load.
- ✅ CTA "Đăng ký khảo sát" điều hướng tới `/dang-ky`.

## B. Intake form
- ✅ Submit hợp lệ ⇒ tạo survey_request + lead (assert qua API + repository).
- ✅ Thiếu email ⇒ chặn submit, hiện lỗi tiếng Việt.
- ✅ Thiếu SĐT ⇒ chặn submit.
- ✅ Thiếu consent xử lý dữ liệu ⇒ chặn submit.
- ✅ Email/SĐT sai định dạng ⇒ lỗi field cụ thể.
- ✅ MST trùng case đang mở ⇒ trả `duplicateWarning=true`.

## C. Workflow & trạng thái
- ✅ Chuyển trạng thái hợp lệ theo `CASE_STATUS_TRANSITIONS` ⇒ thành công + history.
- ✅ Chuyển trạng thái không hợp lệ ⇒ `STATE_TRANSITION_INVALID`, không đổi state.
- ✅ Mọi chuyển trạng thái sinh audit log.

## D. Mã hồ sơ
- ✅ Sinh mã đúng định dạng `DN-YYYYMMDD-00001`.
- ✅ Sinh 1000 mã liên tiếp không trùng (test counter).
- ✅ Mã reset counter theo ngày.

## E. Google Drive (mock adapter)
- ✅ Tạo folder root + đủ 12 subfolder đúng tên chuẩn.
- ✅ Lưu `driveFolderId` vào `drive_folders`.
- ✅ Drive adapter ném lỗi ⇒ case vẫn tồn tại, `drive_pending`, có thể retry.

## F. Upload & metadata (phase 4)
- ✅ Upload xong có `documents` record với uploader, timestamp, category, driveFileId. (`documents.test.ts`)
- ✅ Đổi tên file đúng quy ước (chứa mã hồ sơ + nhóm). (`documents.test.ts`, HTTP smoke)
- ✅ Chặn mime ngoài whitelist. (`documents.test.ts`)
- ✅ Chặn file quá dung lượng (>25MB). (`documents.test.ts`)
- ✅ Checklist hiển thị đủ/thiếu (DocumentChecklist + countByKey).

## G. AI analysis & lawyer review (phase 7-9)
- ✅ AI sinh finding nháp bắt buộc kèm evidence; thiếu evidence ⇒ `checker_flagged`. (`ai-analysis.test.ts`)
- ✅ Accept/edit/reject/request_docs finding (service `findings.ts`; HTTP route review).
- ✅ Không approve report khi còn finding chưa duyệt ⇒ `ReportGuardError`. (`e2e-flow.test.ts`)
- ✅ Không export final khi chưa có lawyer approval ⇒ `LAWYER_APPROVAL_REQUIRED`. (`report.test.ts`)
- ✅ Finding thiếu evidence không vào final ⇒ `EVIDENCE_REQUIRED`. (`report.test.ts`)
- ✅ Roadmap 30-90 ngày sinh tự động sau khi duyệt báo cáo. (`e2e-flow.test.ts`)

## H. RBAC & bảo mật
- ✅ Customer truy cập case không thuộc org mình ⇒ forbidden. (`rbac.test.ts`)
- ✅ Customer list chỉ chứa hồ sơ org mình. (`rbac.test.ts`)
- ✅ Intake KHÔNG approve report (route 403). (HTTP smoke + route guard)
- ✅ Section guard: intake≠admin, customer≠lawyer. (`rbac.test.ts`)

## I. Resilience
- ✅ Adapter lỗi không làm crash route (trả `PROVIDER_ERROR`, ghi trạng thái lỗi).
- ⬜ Job retry cho OCR/AI/Drive.

## J. Code quality / build
- ✅ `npm run typecheck` pass (TS strict).
- ✅ `npm run lint` pass.
- ✅ `npm run build` pass.
- ✅ `npm run test` pass.
- ✅ Responsive desktop/mobile, không overflow.

## Test commands
```bash
npm run test         # vitest: shared logic, schemas, services, API handlers
npm run typecheck    # tsc --noEmit
npm run lint         # next lint / eslint
npm run build        # next build
```
