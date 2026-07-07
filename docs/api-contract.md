# LEGAL360 — API Contract (MVP)

REST/JSON qua Next.js Route Handlers dưới `app/api`. Mọi response bọc trong:

```jsonc
// success
{ "ok": true, "data": <T> }
// error
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": {"email": "…"} } }
```

Mã lỗi: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`STATE_TRANSITION_INVALID`, `PROVIDER_ERROR`, `EVIDENCE_REQUIRED`, `LAWYER_APPROVAL_REQUIRED`.

Phân quyền: cookie phiên `legal360_session` ký HMAC, HTTP-only. Mỗi endpoint ghi rõ role được phép.

---

## Phase 1 (implemented)

### POST `/api/leads`  — tạo lead từ intake form
- **Roles:** public
- **Body:** `SurveyRequestInput` (zod `surveyRequestSchema`) — DN, MST, người đại diện, ngành nghề,
  loại hình, headcount, market, mục tiêu, yêu cầu đặc biệt, liên hệ (email + phone bắt buộc),
  thời gian/địa điểm mong muốn, ghi chú, `consent: true`.
- **Behavior:** tạo `organization` (nếu chưa có theo MST) + `contact` + `survey_request` (leadStatus=`lead_new`)
  + `case`(status=`lead_new`) + audit log. Nếu MST trùng case đang mở ⇒ `data.duplicateWarning=true` (vẫn tạo, cảnh báo intake).
- **200:** `{ ok:true, data:{ caseId, caseCode:null, leadStatus:"lead_new", duplicateWarning } }`
- **Errors:** `VALIDATION_ERROR` (thiếu email/phone/consent).

### GET `/api/leads` — danh sách lead
- **Roles:** admin, intake. **Query:** `status?, q?, page?, pageSize?`
- **200:** `{ ok:true, data:{ items: LeadListItem[], total, page, pageSize } }`

### GET `/api/cases` — danh sách hồ sơ (pipeline)
- **Roles:** admin, intake, lawyer (chỉ assigned), reviewer.
- **Query:** `status?, assignedLawyerId?, q?`
- **200:** `{ items: CaseListItem[], total }`

### GET `/api/cases/:id` — chi tiết hồ sơ
- **Roles:** admin, intake, assigned lawyer/reviewer; customer **chỉ** case của org mình.
- **200:** `CaseDetail` (org, contact, status, timeline, documents summary, findings summary).
- **403:** customer truy cập case không thuộc org mình.

### POST `/api/cases/:id/transition` — chuyển trạng thái
- **Roles:** theo trạng thái đích. **Body:** `{ toStatus, note? }`
- **200:** case mới + bản ghi history. **422:** `STATE_TRANSITION_INVALID`.

### GET `/api/audit-logs` — Roles: admin. Query `entityType?, entityId?, actorId?`.

---

## Phase 2-3 (implemented/provider-backed)

### POST `/api/cases/:id/conflict-check`
- Roles: intake, admin. Body `{ result, matchedAgainst?, note }`. Chặn `proposal` nếu chưa `clear`.

### POST `/api/cases/:id/proposal` / POST `/api/cases/:id/contract`
- Roles: intake, accountant. Tạo báo phí/hợp đồng từ template + version.

### POST `/api/cases/:id/open`
- Roles: intake, admin. Sinh `caseCode`, tạo case chính thức, **gọi Drive adapter** tạo folder + 12 subfolder.
- Drive lỗi ⇒ `drive_folders.status=drive_pending` + retry job; **không** rollback case.
- **200:** `{ caseCode, driveFolderId|null, driveStatus }`

---

## Phase 4 (scaffolded)

### POST `/api/cases/:id/documents` — upload (multipart)
- Roles: customer (own case), staff, intake.
- Đổi tên file `DN-…_<slug>_<catKey>_<date>.<ext>`, gọi Drive adapter, lưu `documents` + metadata.
- Validate: mime whitelist, size, (virus scan stub). **200:** `Document`.

### GET `/api/cases/:id/checklist` — trạng thái đủ/thiếu theo `document_categories`.

---

## Phase 6-9 (implemented/provider-backed)

### POST `/api/cases/:id/ai/ocr` | `/ai/analyze` | `/ai/check`
- Roles: staff, lawyer, admin. Enqueue `ai_runs`. AI adapter provider-backed trả JSON theo schema.
- Output `legal_findings` luôn `status=ai_draft`, **bắt buộc** evidence; thiếu ⇒ checker flag.

### GET `/api/cases/:id/findings` / POST `/api/findings/:id/review`
- Roles: assigned lawyer, reviewer. `action: accept|edit|reject|request_docs`.

### POST `/api/cases/:id/findings` — luật sư tự soạn 1 phát hiện thủ công
- Roles: lawyer/reviewer/admin (+ object-level access). Chỉ ở trạng thái `ai_analyzing|lawyer_reviewing|report_drafting|report_revision`.
- Body: `{ title, description, riskLevel, groupKey?, recommendation?, legalBasis (bắt buộc), evidence? }`.
- Tạo finding `status=lawyer_edited` + 1 evidence (căn cứ pháp lý) ⇒ đủ điều kiện vào báo cáo final ngay.

### POST `/api/cases/:id/report` (generate) / POST `/api/reports/:id/approve` / `/lock`
- **Guard:** `EVIDENCE_REQUIRED` nếu finding final thiếu evidence;
  `LAWYER_APPROVAL_REQUIRED` nếu export final chưa có `approve_report`.
- Report export sinh DOCX/HTML thật từ dữ liệu đã được luật sư duyệt và lưu version.

### GET `/api/cases/:id/roadmap` / POST `/api/cases/:id/roadmap` — roadmap 30-90 ngày.

---

## Hợp đồng kiểu dữ liệu

Tất cả request/response type sinh từ zod schema trong `src/shared/schemas.ts` để FE/BE
dùng chung (single source of truth). DTO list-item type ở `src/shared/dto.ts`.
