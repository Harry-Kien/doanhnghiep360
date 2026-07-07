# LEGAL360 — Data Model

Database là **nguồn dữ liệu chính**. Canonical schema (model chuẩn): `prisma/schema.prisma`.

**Runtime persistence — SQLite bền vững (ACID).** Runtime dùng một Database in-memory (đọc/ghi đồng bộ qua `getDb()` / `commit()`) được hậu thuẫn bởi **SQLite** (`better-sqlite3`) tại `.data/legal360.db`:
- Mỗi collection ↦ 1 bảng SQLite (`id` PK, `case_id` có index, cột `data` chứa JSON của record); singleton (`caseCodeCounters`, `meta`) lưu ở bảng `kv`.
- `commit()` ghi toàn bộ state trong **một transaction** (atomic → không hỏng dữ liệu khi crash). Bật **WAL** (`journal_mode=WAL`, `synchronous=NORMAL`) cho an toàn + đọc đồng thời.
- Chế độ qua `DATA_STORE`: `sqlite` (mặc định, bền vững) · `memory` (test, không ghi đĩa). Giá trị `file` (đời đầu) được coi như `sqlite`.
- **Migration tự động:** lần đầu chạy với SQLite, nếu DB rỗng và còn `.data/db.json` (file store đời đầu) → nạp toàn bộ vào SQLite rồi đổi tên thành `db.json.migrated` (không import lại). Dữ liệu HOUSTON123 flagship được giữ nguyên.
- Vì sao SQLite đồng bộ thay vì Prisma Client (async): toàn bộ ~30 service/route hiện đồng bộ; giữ đồng bộ là phương án **ổn định & ít rủi ro nhất**, không phải viết lại async toàn hệ thống. `prisma/schema.prisma` vẫn là model chuẩn để tham chiếu / migrate Postgres sau này.

Code: `src/server/db/sqlite.ts` (backend) · `src/server/db/store.ts` (init/commit) · test bền vững: `src/server/db/sqlite.test.ts`.

## Quy ước chung

- PK: `id` (cuid/uuid string). Mọi bảng có `createdAt`, `updatedAt`.
- Enum trạng thái dùng chung từ `src/shared/status.ts`.
- FK đặt tên `<entity>Id`. Soft-delete bằng `deletedAt` (nullable) cho bảng nhạy cảm.
- Mọi hành động quan trọng ghi `audit_logs` (actor, action, entity, before/after).

## Bảng & quan hệ chính

### Identity & tổ chức
- **users** — `id, email, phone, fullName, role(enum), passwordHash, isActive`. 1 user ↔ N cases (assignee).
- **roles** — danh mục role (seed: admin, intake, lawyer, reviewer, staff, customer, accountant).
- **organizations** — doanh nghiệp KH: `id, name, slug, taxCode(MST), address, businessType, industry, headcount, market`.
- **contacts** — người liên hệ: `id, orgId(FK), fullName, position, email, phone, isPrimary`.

### Hồ sơ (case) & workflow
- **cases** — `id, caseCode(unique, DN-YYYYMMDD-#####), orgId, primaryContactId, status(enum), package(enum), assignedLawyerId, reviewerId, intakeOwnerId, openedAt, slaDueAt`.
- **case_status_history** — `id, caseId, fromStatus, toStatus, changedById, note, createdAt`.
- **conflict_checks** — `id, caseId, result(enum: clear|potential_conflict|rejected), checkedById, matchedAgainst(json), note`.
- **audit_logs** — `id, actorId, action, entityType, entityId, metadata(json), ip, createdAt`.
- **notifications** — `id, userId, channel(email|sms|zalo|inapp), title, body, status, sentAt`.

### Thương mại
- **proposals** — báo phí: `id, caseId, package, amount, vatAmount, currency, status(draft|sent|accepted|rejected), validUntil`.
- **contracts** — `id, caseId, proposalId, code, templateVersion, status(draft|sent|signed|void), signedFileDocumentId, signedAt`.
- **payments** — `id, caseId, milestone(deposit|final), amount, method, status(pending|paid|overdue), paidAt`.

### Tài liệu & Drive
- **drive_folders** — mapping case ↔ Drive: `id, caseId, driveFolderId, name, parentFolderId, subfolderKey(nullable), status(active|drive_pending|error)`.
- **document_categories** — 12 nhóm chuẩn (00..99). `key, name, order, required(bool)`.
- **documents** — `id, caseId, categoryId, originalName, storedName, mimeType, sizeBytes, driveFileId, uploaderId, status(enum), checksum`.
- **document_versions** — `id, documentId, version, driveFileId, uploaderId, note`.

### Khảo sát
- **survey_requests** — phiếu Mẫu 01 (intake): toàn bộ trường intake + `leadStatus(enum)`.
- **survey_plans** — `id, caseId, mode(online|offline), scheduledAt, location, meetingUrl, participants(json), prepChecklist(json)`.
- **survey_sessions** — buổi khảo sát: `id, planId, startedAt, endedAt, conductedById`.
- **survey_minutes** — biên bản: `id, sessionId, content(json), exportedDocId`.
- **survey_answers** — `id, sessionId, groupKey, questionKey, answer, evidenceDocumentId`.

### AI & pháp lý
- **ai_runs** — mỗi lần chạy: `id, caseId, type(ocr|extract|classify|analyze|check), provider, status(queued|running|done|error), input(json), output(json), confidence, error, startedAt, finishedAt`.
- **extracted_fields** — `id, documentId, aiRunId, key, value, confidence, verifiedById(nullable)`.
- **legal_findings** — `id, caseId, code, groupKey, title, description, riskLevel(enum: low|medium|high|critical), recommendation, confidence, status(ai_draft|checker_flagged|lawyer_accepted|lawyer_edited|rejected), needsLawyer(bool)`.
- **finding_evidence** — `id, findingId, documentId, snippet, legalBasis` (bắt buộc ≥1 để finding vào final).
- **risk_scores** — `id, caseId, groupKey, score, level`.
- **lawyer_reviews** — `id, caseId, findingId(nullable), reviewerId, action(accept|edit|reject|request_docs|approve_report), note, createdAt`.

### Báo cáo & roadmap
- **reports** — `id, caseId, currentVersionId, status(draft|in_review|approved|delivered|locked)`.
- **report_versions** — `id, reportId, version, kind(ai_draft|lawyer_draft|final), docxDocId, pdfDocId, createdById, approvedById, lockedAt`.
- **roadmap_items** — `id, caseId, title, phase(d30|d60|d90), priority(low|med|high), ownerRole, dueAt, status(open|in_progress|done)`.

## Sơ đồ quan hệ (rút gọn)

```
organizations 1─N contacts
organizations 1─N cases ─1 contact(primary)
cases 1─N case_status_history / conflict_checks / proposals / contracts / payments
cases 1─1 drive_folders(root) 1─N drive_folders(sub)
cases 1─N documents ─N document_versions ; documents ─N category
cases 1─N survey_plans ─N sessions ─N minutes/answers
cases 1─N ai_runs / legal_findings(─N finding_evidence) / risk_scores
cases 1─1 reports ─N report_versions
cases 1─N roadmap_items
* ─ audit_logs (polymorphic by entityType/entityId)
```

## Bất biến (invariants) thực thi ở service layer

- `legal_findings.status = lawyer_accepted|lawyer_edited` **và** có ≥1 `finding_evidence` ⇒ mới được đưa vào `report_versions.kind = final`.
- `report_versions.kind = final` chỉ tạo được khi tồn tại `lawyer_reviews.action = approve_report`.
- Mọi đổi `cases.status` phải hợp lệ theo `CASE_STATUS_TRANSITIONS` và sinh `case_status_history` + `audit_logs`.
- `cases.caseCode` unique; sinh qua counter theo ngày.
