# LEGAL360 — Product Specification (MVP)

> Khảo sát Pháp lý Doanh nghiệp 360°
> Phiên bản: 0.1 (MVP) — Ngày: 18/06/2026
> Source of truth: `legal360-implementation-blueprint.md` + `legal360-bpmn-workflow.mmd`

## 1. Tóm tắt sản phẩm

Legal360 là hệ thống vận hành dịch vụ **Khảo sát pháp lý doanh nghiệp 360°** cho công ty luật.
Hệ thống số hóa toàn bộ quy trình: tiếp nhận khách hàng → mã hồ sơ → kho tài liệu (Google Drive) →
OCR + AI phân tích rủi ro → **luật sư duyệt cuối (bắt buộc)** → xuất báo cáo + roadmap 30-90 ngày →
follow-up hợp đồng tư vấn thường xuyên.

**Nguyên tắc lõi (không được vi phạm):**

1. Database là nguồn dữ liệu chính. Google Drive chỉ là kho file. Google Sheet chỉ là bảng theo dõi phụ.
2. AI chỉ hỗ trợ, **không kết luận cuối**. Luật sư duyệt cuối là bắt buộc.
3. Mỗi finding phải có **evidence** từ tài liệu. Không có evidence ⇒ không vào báo cáo final.
4. Không xuất báo cáo final nếu chưa có lawyer approval.
5. Mỗi hành động quan trọng có **audit log**. Mỗi báo cáo có **version**.
6. Khách hàng chỉ xem hồ sơ của chính họ (RBAC + data scoping).
7. Provider lỗi (Drive/OCR/AI) không làm app chết — có trạng thái lỗi + retry/manual review.

## 2. Phạm vi MVP

| Trong scope (MVP) | Ngoài scope (phase sau) |
|---|---|
| Landing page chuyên nghiệp | E-sign tích hợp (chỉ upload bản ký) |
| Intake form (Mẫu 01) + lead | Thanh toán online (chỉ tracking thủ công) |
| Xác thực + conflict check (thủ công) | OCR cloud thật (dùng mock adapter) |
| Báo phí / hợp đồng (generator cơ bản) | AI provider thật (dùng mock adapter) |
| Sinh mã hồ sơ + tạo Drive (mock adapter) | Multi-tenant, billing tự động |
| Upload portal + checklist tài liệu | Mobile app native |
| Lawyer review portal (finding accept/edit/reject) | |
| Report builder (DOCX/PDF qua adapter) + version | |
| Admin/ops dashboard + audit log | |

**Phase implement trong repo này:** Phase 0 (nền tảng) + Phase 1 (landing, intake, lead, dashboard).
Các phase 2-10 được scaffold (interface, route stub, trạng thái) để mở rộng.

## 3. Vai trò người dùng (RBAC)

| Role | Quyền chính |
|---|---|
| `admin` | Toàn quyền: user, template, settings, mọi hồ sơ, audit log |
| `intake` | Lead, conflict check, báo phí/hợp đồng, theo dõi thanh toán, mở case |
| `lawyer` | Hồ sơ được phân công: xem tài liệu, sửa/duyệt finding, duyệt báo cáo |
| `reviewer` | Duyệt cuối (partner), yêu cầu chỉnh sửa, khóa version |
| `staff` | Nhập liệu, khảo sát, biên bản, hỗ trợ phân loại |
| `customer` | Chỉ hồ sơ của mình: upload tài liệu, nhận báo cáo, trả lời yêu cầu bổ sung |
| `accountant` | Hợp đồng, phí, thanh toán, hóa đơn |

## 4. User stories chính (MVP)

- **US-01** Là khách hàng, tôi xem landing page hiểu dịch vụ & phí, bấm "Đăng ký khảo sát".
- **US-02** Là khách hàng, tôi điền phiếu yêu cầu khảo sát nhiều bước, được validate, nhận xác nhận.
- **US-03** Là intake, tôi thấy lead mới trong dashboard với trạng thái và next action rõ ràng.
- **US-04** Là intake, tôi chạy conflict check và ghi kết quả (clear / potential / rejected).
- **US-05** Là hệ thống, khi case mở tôi sinh mã `DN-YYYYMMDD-00001` không trùng và tạo cấu trúc Drive.
- **US-06** Là khách hàng, tôi upload tài liệu theo checklist và thấy tiến độ đủ/thiếu.
- **US-07** Là luật sư, tôi xem AI draft + tài liệu gốc, accept/edit/reject từng finding.
- **US-08** Là hệ thống, tôi **chặn** xuất báo cáo final khi còn finding chưa duyệt hoặc thiếu lawyer approval.
- **US-09** Là khách hàng, tôi nhận báo cáo + checklist + roadmap 30-90 ngày trong portal.
- **US-10** Là admin, tôi thấy hồ sơ đang nghẽn, SLA, và audit log.

## 5. Workflow & trạng thái

Xem `docs/bpmn-workflow.md`. Tập trạng thái hồ sơ (24 trạng thái) định nghĩa trong
`src/shared/status.ts` là **single source of truth** cho cả frontend lẫn backend.

Quy tắc chuyển trạng thái (state machine) được kiểm soát ở `src/shared/status.ts`
(`CASE_STATUS_TRANSITIONS`) — không cho nhảy trạng thái tùy tiện.

## 6. Kiến trúc kỹ thuật (MVP)

```
Next.js App Router (TypeScript strict)
├─ app/(marketing)         Landing page
├─ app/(portal)            Customer portal
├─ app/(internal)          Intake / Lawyer / Admin
├─ app/api/*               Route Handlers (lead, case, documents, review, report)
├─ src/shared              Enums, types, zod schemas, RBAC  (≈ packages/shared)
├─ src/server/repositories Repository abstraction + in-memory/JSON store (≈ packages/db)
├─ src/server/adapters     Drive / OCR / AI / Report adapters (interface + mock)
├─ src/server/services     Business logic (case-code, audit, workflow)
└─ prisma/schema.prisma    Canonical data model (deliverable; swap-in ready)
```

**Adapter pattern:** mỗi provider có interface trong `adapters/<name>/types.ts`, một mock
(`mock.ts`) và chỗ cắm provider thật (`google.ts`, `azure.ts`...). App đọc biến môi trường
để chọn provider; default = mock ⇒ chạy local không cần API key.

## 7. Acceptance criteria (MVP, mức sản phẩm)

1. `npm install && npm run dev` chạy được local, không console error.
2. Landing page render đủ 8 section, responsive desktop/mobile, không overflow.
3. Submit intake form hợp lệ ⇒ tạo `survey_request` + `lead` + `contact` + `organization`.
4. Validate form: thiếu email/SĐT ⇒ chặn submit; hiển thị lỗi tiếng Việt.
5. Sinh mã hồ sơ không trùng (test concurrency).
6. Tạo Drive bằng **mock adapter** ⇒ đủ 12 subfolder, lưu `folder_id`.
7. Chuyển trạng thái chỉ theo state machine hợp lệ; mọi chuyển có audit log.
8. Không approve report khi còn finding chưa duyệt; không export final khi chưa lawyer approval.
9. Toàn bộ text UI tiếng Việt. TypeScript strict, không `any` tùy tiện.

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| AI viện dẫn luật sai / không evidence | AI checker + bắt buộc lawyer review + chặn finding thiếu evidence |
| Drive/OCR/AI provider lỗi | Adapter + trạng thái lỗi + retry job + manual fallback |
| Mã hồ sơ trùng | Generator dùng counter atomic theo ngày + unique constraint |
| Rò rỉ dữ liệu khách hàng | RBAC + data scoping (customer chỉ thấy hồ sơ mình) + audit log |
| Hợp đồng mẫu còn lỗi Bên A/B | Cờ "cần luật sư rà" trên template trước khi generate |
