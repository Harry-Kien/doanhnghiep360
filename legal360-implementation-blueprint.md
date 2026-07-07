# LEGAL360 - BLUEPRINT TRIỂN KHAI PRODUCT KHẢO SÁT DOANH NGHIỆP 360

Ngày lập: 18/06/2026  
Mục tiêu: biến bộ quy trình và biểu mẫu khảo sát doanh nghiệp hiện có thành một product phần mềm vận hành được thực tế cho công ty luật, có Landing Page, CRM, mã hồ sơ, Google Drive, upload tài liệu, AI OCR, AI phân tích, luật sư review, xuất báo cáo và roadmap xử lý 30-90 ngày.

## 1. Kết luận sau khi đọc toàn bộ tài liệu

Bộ tài liệu hiện có đã đủ nền để biến thành product thật. Đây không phải chỉ là ý tưởng landing page. Nó đã có bộ nghiệp vụ lõi của công ty luật gồm: thư ngỏ, phiếu yêu cầu khảo sát, hợp đồng dịch vụ pháp lý, kế hoạch khảo sát, phiếu ghi chép khảo sát, biên bản khảo sát, báo cáo khảo sát, báo phí và bảng kê biểu mẫu.

Tuy nhiên, bộ tài liệu hiện tại đang ở dạng quy trình thủ công. Để đưa vào phần mềm, cần chuẩn hóa thành workflow có trạng thái, vai trò, mã hồ sơ, dữ liệu, tài liệu, kiểm duyệt, audit log và phân quyền. Phần AI nên là lớp hỗ trợ xử lý và gợi ý, không phải lớp quyết định cuối cùng. Báo cáo cuối bắt buộc phải có luật sư hoặc chuyên viên pháp lý duyệt.

Định vị tốt nhất cho MVP là: Legal Health Check 360 hoặc Khảo sát pháp lý doanh nghiệp 360. Nếu muốn gọi là Khảo sát doanh nghiệp 360 toàn diện thì cần bổ sung sâu hơn về tài chính, vận hành, nhân sự, marketing, công nghệ và chiến lược. Bộ tài liệu hiện tại đã chạm đến hệ thống quản lý, khách hàng, kênh phân phối, doanh thu, văn hóa và AI, nhưng phần mạnh nhất vẫn là pháp lý - lao động - thương mại - đầu tư - quản trị doanh nghiệp.

## 2. Tài liệu nguồn và vai trò trong hệ thống

| STT | Tài liệu | Vai trò nghiệp vụ | Module phần mềm tương ứng |
|---|---|---|---|
| 1 | 1. Quy trình khảo sát Doanh nghiệp | Quy trình nội bộ 6 bước: tiếp nhận, hợp đồng, kiểm tra hồ sơ, khảo sát, báo cáo, đề xuất hợp đồng dài hạn | Workflow engine, trạng thái hồ sơ, task assignment |
| 2 | Thư ngỏ - Khảo sát Doanh nghiệp 360 | Tài liệu marketing, giới thiệu dịch vụ, phạm vi và phí 5.000.000 đồng | Landing Page, email giới thiệu, brochure PDF |
| 3 | Mẫu 01 - Phiếu yêu cầu khảo sát | Intake form: thông tin DN, mục tiêu, yêu cầu đặc biệt, liên hệ, thời gian khảo sát | Customer intake form, lead record, survey request |
| 4 | Mẫu 02 - Hợp đồng dịch vụ pháp lý | Engagement letter/hợp đồng, phí, thanh toán, quyền nghĩa vụ, bảo mật | Contract generator, e-sign, payment milestone |
| 5 | Mẫu 03 - Kế hoạch khảo sát | Lịch khảo sát, địa điểm, thành phần, nội dung, tài liệu cần chuẩn bị | Survey plan, calendar, checklist tài liệu |
| 6 | Mẫu 04 - Phiếu khảo sát | Phiếu ghi chép khảo sát thực địa | Survey note form, offline/online capture |
| 7 | Mẫu 05 - Biên bản khảo sát | Biên bản làm việc, nội dung pháp luật và hệ thống quản lý | Survey session, minutes, evidence capture |
| 8 | Mẫu 06 - Báo cáo khảo sát | Report skeleton: thông tin DN, vấn đề, phương pháp, kết quả, bảo mật | Report builder, lawyer review, export PDF/DOCX |
| 9 | Mẫu 07 - Báo phí dịch vụ khảo sát DN | Báo giá dịch vụ | Pricing package, proposal generator |
| 10 | Bảng kê | Danh mục biểu mẫu | Template registry |
| 11 | Phụ lục - Biểu mẫu | Bộ biểu mẫu tổng hợp | Template repository, document versioning |

## 3. Những điểm cần chuẩn hóa trước khi code

1. Tên sản phẩm nên dùng một cách thống nhất: Legal360, Khảo sát pháp lý doanh nghiệp 360, hoặc Legal Health Check 360.
2. Trong tài liệu có chỗ ghi 3600, cần sửa thành 360° hoặc 360.
3. Hợp đồng mẫu có vài câu nhầm Bên A/Bên B trong quyền và nghĩa vụ. Trước khi đưa vào generator, cần luật sư rà lại toàn bộ hợp đồng.
4. Báo phí hiện đang hơi chung cho tư vấn/tố tụng. Cần chuyển thành bảng gói dịch vụ riêng cho khảo sát doanh nghiệp.
5. Mẫu 04 phiếu khảo sát còn quá mỏng, cần biến thành form số có nhóm câu hỏi rõ ràng.
6. Google Sheet không nên là nguồn dữ liệu chính. Nên dùng database/CRM, còn Google Sheet chỉ là bảng vận hành phụ.
7. Cần bổ sung conflict check, consent xử lý dữ liệu, phân quyền, audit log, version báo cáo và disclaimer AI.

## 4. BPMN chuẩn hóa theo lane

### Lane 1 - Khách hàng

Start -> Truy cập landing page -> Đọc thư ngỏ/dịch vụ -> Điền phiếu yêu cầu khảo sát -> Xác thực email/SĐT/OTP -> Nhận báo phí/hợp đồng -> Ký hợp đồng -> Thanh toán -> Nhận checklist tài liệu -> Upload tài liệu -> Tham gia khảo sát online/offline -> Bổ sung tài liệu nếu thiếu -> Nhận báo cáo -> Theo dõi roadmap 30-90 ngày -> End.

### Lane 2 - Intake/Sales/Legal Ops

Nhận lead -> kiểm tra thông tin -> tạo group Zalo/email thread nếu cần -> thực hiện conflict check -> gửi báo phí -> gửi hợp đồng -> theo dõi ký và thanh toán -> tạo hồ sơ chính thức -> phân công luật sư/chuyên viên -> theo dõi tiến độ.

### Lane 3 - Hệ thống CRM/Database

Tạo lead -> tạo organization -> tạo contact -> sinh case code -> tạo case -> ghi status history -> tạo task -> tạo checklist tài liệu -> lưu payment status -> lưu audit log -> đồng bộ Drive/Sheet/dashboard.

### Lane 4 - Kho tài liệu/Google Drive

Tạo folder theo mã hồ sơ -> tạo subfolder -> nhận file upload -> kiểm tra file -> lưu metadata -> phân loại tài liệu -> giữ bản gốc -> tạo bản OCR text -> tạo bản trích xuất structured JSON -> tạo thư mục kết quả.

### Lane 5 - AI Processing

OCR -> extract fields -> classify document -> map vào nhóm khảo sát -> tạo summary -> phát hiện thiếu tài liệu -> legal risk draft -> AI checker -> confidence score -> tạo bản nháp finding/report.

### Lane 6 - Luật sư/Chuyên viên pháp lý

Xem hồ sơ -> xem tài liệu gốc -> xem bản AI đề xuất -> sửa finding -> thêm căn cứ pháp luật -> xếp mức độ rủi ro -> yêu cầu bổ sung nếu thiếu -> duyệt báo cáo -> khóa bản cuối.

### Lane 7 - Báo cáo/CSKH

Tạo report version -> xuất DOCX/PDF -> gửi khách -> tạo checklist xử lý -> tạo roadmap 30-90 ngày -> tạo follow-up task -> đề xuất hợp đồng tư vấn thường xuyên.

## 5. Quy ước mã hồ sơ và Google Drive

Mã hồ sơ nên tách thành hai phần: mã kỹ thuật ổn định và tên hiển thị theo doanh nghiệp.

Cấu trúc khuyến nghị:

- Case code: DN-YYYYMMDD-00001
- Company slug: HOUSTON123 hoặc CONG-TY-ABC
- Tên folder Drive: DN-20260618-00001_HOUSTON123
- Tên file gốc khi upload: DN-20260618-00001_HOUSTON123_01_GPKD_2026-06-18.pdf

Folder Drive nên tạo như sau:

1. 00.Hop_dong_va_thanh_toan
2. 01.Thong_tin_doanh_nghiep
3. 02.Phap_ly_doanh_nghiep
4. 03.Thue_ke_toan
5. 04.Lao_dong_BHXH
6. 05.Hop_dong_thuong_mai
7. 06.SHTT_tai_san_so
8. 07.Tranh_chap_to_tung
9. 08.He_thong_quan_ly
10. 09.AI_OCR_va_phan_tich
11. 10.Ket_qua_bao_cao
12. 99.Luu_tru_noi_bo

Google Drive là kho file. Database mới là nơi quản lý trạng thái, metadata, quyền, lịch sử và kết quả phân tích.

## 6. Trạng thái hồ sơ chuẩn

1. lead_new - Khách hàng mới đăng ký
2. lead_verified - Đã xác thực email/SĐT
3. conflict_checking - Đang kiểm tra xung đột lợi ích
4. conflict_cleared - Đã qua conflict check
5. proposal_sent - Đã gửi báo phí/hợp đồng
6. contract_pending - Chờ ký hợp đồng
7. payment_pending - Chờ thanh toán
8. case_opened - Hồ sơ chính thức được mở
9. waiting_documents - Chờ upload tài liệu
10. documents_received - Đã nhận tài liệu
11. document_reviewing - Đang kiểm tra tài liệu
12. need_more_documents - Cần bổ sung tài liệu
13. ocr_processing - Đang OCR
14. ai_classifying - Đang phân loại tài liệu
15. ai_analyzing - Đang AI phân tích
16. lawyer_reviewing - Chờ luật sư review
17. report_drafting - Đang soạn báo cáo
18. report_revision - Đang chỉnh sửa theo review
19. approved - Báo cáo đã duyệt
20. delivered - Đã gửi khách hàng
21. roadmap_followup - Đang theo dõi roadmap
22. retainer_proposed - Đã đề xuất hợp đồng tư vấn thường xuyên
23. completed - Hoàn tất
24. cancelled - Hủy hồ sơ

## 7. Kiến trúc repo như một team dev thật sự

Nên dùng monorepo để quản lý web, API, worker AI và thư viện chung.

Tên repo chính: legal360-platform

Cấu trúc đề xuất:

```text
legal360-platform/
  apps/
    web/                 # Next.js: landing, customer portal, lawyer portal, admin dashboard
    api/                 # Backend API: case, workflow, Drive, report, payment
    worker/              # Python/FastAPI worker: OCR, AI extraction, legal analysis
  packages/
    db/                  # Prisma/Drizzle schema, migrations
    shared/              # TypeScript types, status enum, validation schema
    ui/                  # Design system components
    prompts/             # Prompt templates, AI checker prompts, legal analysis prompts
    templates/           # DOCX templates and report template versions
  infra/
    docker-compose.yml
    nginx/
    scripts/
  docs/
    bpmn/
    product-spec/
    api-contract/
    data-contract/
    qa-checklist/
```

Repo phụ nếu muốn tách như công ty thật:

1. legal360-platform: app chính.
2. legal360-doc-templates: lưu template hợp đồng, phiếu khảo sát, báo cáo, version biểu mẫu.
3. legal360-ai-lab: thử nghiệm OCR, prompt, phân loại, benchmark AI.
4. legal360-infra: deployment, Docker, backup, monitoring, CI/CD.

Khuyến nghị MVP: bắt đầu bằng một monorepo trước, khi team lớn mới tách repo.

## 8. Stack kỹ thuật khuyến nghị

Frontend:
- Next.js App Router, TypeScript, Tailwind, shadcn/ui.
- Form: react-hook-form + zod.
- Portal: customer portal, lawyer portal, admin dashboard.

Backend:
- Node.js/NestJS hoặc Next.js Route Handlers cho MVP.
- PostgreSQL làm database chính.
- Prisma hoặc Drizzle ORM.
- Redis/BullMQ cho queue OCR/AI/report.

Database/Auth/File:
- PostgreSQL/Supabase cho MVP nhanh.
- Google Drive API để tạo folder và lưu file theo mã hồ sơ.
- Google Sheet chỉ dùng để export bảng vận hành hoặc backup nhẹ.
- Auth.js/Clerk/Supabase Auth tùy ngân sách.

AI/OCR:
- OCR cloud: Azure Document Intelligence hoặc Google Document AI nếu cần độ ổn định.
- OCR local/fallback: Tesseract, pdfplumber, python-docx.
- LLM: dùng provider có logging, prompt versioning, JSON schema output.
- AI không được ghi đè kết luận luật sư.

Report:
- DOCX template bằng python-docx hoặc docxtemplater.
- PDF export từ DOCX/HTML.
- Report versioning bắt buộc.

DevOps:
- GitHub Actions.
- Docker Compose local: postgres, redis, minio nếu cần storage local.
- Staging và production tách môi trường.
- Backup database và Drive metadata mỗi ngày.

## 9. Data model lõi

Các bảng bắt buộc:

- users: tài khoản nội bộ và khách hàng.
- roles: admin, intake, lawyer, reviewer, customer, accountant.
- organizations: doanh nghiệp khách hàng.
- contacts: người liên hệ.
- cases: hồ sơ khảo sát.
- case_status_history: lịch sử trạng thái.
- conflict_checks: kết quả kiểm tra xung đột lợi ích.
- proposals: báo phí/gói dịch vụ.
- contracts: hợp đồng dịch vụ pháp lý.
- payments: thanh toán/tạm ứng/còn lại.
- drive_folders: folder mapping theo case.
- documents: metadata file upload.
- document_versions: phiên bản tài liệu.
- document_categories: nhóm tài liệu.
- survey_requests: phiếu yêu cầu khảo sát.
- survey_plans: kế hoạch khảo sát.
- survey_sessions: buổi khảo sát online/offline.
- survey_minutes: biên bản khảo sát.
- survey_answers: câu trả lời/ghi chú theo từng nhóm.
- ai_runs: mỗi lần AI OCR/phân tích/checker.
- extracted_fields: dữ liệu đã trích xuất.
- legal_findings: từng phát hiện rủi ro.
- risk_scores: điểm rủi ro theo nhóm.
- lawyer_reviews: review và phê duyệt.
- reports: báo cáo.
- report_versions: version báo cáo.
- roadmap_items: việc cần xử lý 30-90 ngày.
- audit_logs: log mọi hành động quan trọng.
- notifications: email/SMS/Zalo task.

## 10. Phân quyền chuẩn

Admin:
- Quản lý toàn hệ thống, user, template, settings.

Intake/Sales:
- Xem lead, tạo case, gửi báo phí/hợp đồng, theo dõi thanh toán.

Luật sư phụ trách:
- Xem hồ sơ được phân công, xem tài liệu, chỉnh finding, duyệt báo cáo.

Reviewer/Partner:
- Duyệt cuối báo cáo, yêu cầu chỉnh sửa, khóa version.

Chuyên viên:
- Nhập liệu, khảo sát, ghi biên bản, hỗ trợ phân loại.

Khách hàng:
- Chỉ xem hồ sơ của mình, upload tài liệu, nhận báo cáo, trả lời yêu cầu bổ sung.

Kế toán:
- Xem hợp đồng, phí, thanh toán, hóa đơn.

## 11. Lộ trình code theo BPMN - từ bước 0 đến hoàn thiện

### Bước 0 - Khởi tạo dự án như team dev thật

Mục tiêu: dựng nền tảng làm việc chuẩn trước khi code tính năng.

Cần làm:
- Tạo GitHub organization hoặc repo legal360-platform.
- Tạo project board: Backlog, Ready, In Progress, Review, QA, Done.
- Tạo branch strategy: main, develop, feature/*, hotfix/*.
- Tạo monorepo với apps/web, apps/api, apps/worker, packages/db, packages/shared.
- Cài lint, format, typecheck, test, CI.
- Tạo .env.example, README, CONTRIBUTING, SECURITY.

Acceptance criteria:
- Developer mới clone repo và chạy được local trong 30 phút.
- Có script dev, build, test, lint.
- Có CI chạy tự động khi mở pull request.

### Bước 1 - Landing Page và Thư ngỏ số hóa

Nguồn nghiệp vụ: Thư ngỏ - Khảo sát Doanh nghiệp 360.

Mục tiêu: khách hàng hiểu dịch vụ, phạm vi, lợi ích, phí cơ bản và bấm đăng ký.

Tính năng:
- Trang giới thiệu dịch vụ.
- Section: vấn đề DN gặp phải, dịch vụ khảo sát, phạm vi khảo sát, quy trình, kết quả nhận được, phí/gói, CTA.
- Form đăng ký nhanh.
- Lưu lead vào database.

Code modules:
- apps/web/app/page.tsx
- apps/web/app/register/page.tsx
- apps/api/routes/leads
- packages/db/schema/leads

Test:
- Submit form thành công.
- Validate email/SĐT.
- Không tạo lead trùng nếu cùng MST/email trong thời gian ngắn.

### Bước 2 - Phiếu yêu cầu khảo sát online

Nguồn nghiệp vụ: Mẫu 01 - Phiếu yêu cầu khảo sát.

Mục tiêu: chuyển phiếu yêu cầu giấy thành form số.

Trường dữ liệu:
- Tên doanh nghiệp, MST, địa chỉ, GCN đăng ký doanh nghiệp.
- Người đại diện pháp luật, chức vụ.
- Ngành nghề chính, loại hình doanh nghiệp.
- Số lượng lao động, thị trường hoạt động.
- Mục tiêu khảo sát.
- Yêu cầu đặc biệt.
- Người liên hệ, email, SĐT.
- Thời gian/địa điểm mong muốn.
- Ghi chú.

Gateway:
- Nếu thiếu email/SĐT -> không cho submit.
- Nếu MST trùng case đang mở -> cảnh báo cho intake.

Acceptance criteria:
- Form lưu thành survey_request.
- Có trạng thái lead_new -> lead_verified.
- Có email xác nhận cho khách hàng.

### Bước 3 - Xác thực và conflict check

Nguồn nghiệp vụ cần bổ sung vì tài liệu hiện chưa có.

Mục tiêu: chuẩn công ty luật trước khi nhận việc.

Tính năng:
- OTP email/SĐT.
- Conflict check theo tên doanh nghiệp, MST, người đại diện, bên tranh chấp nếu có.
- Intake nhập kết quả: clear, potential_conflict, rejected.

Gateway:
- Nếu conflict rejected -> đóng lead.
- Nếu potential_conflict -> partner duyệt.
- Nếu clear -> chuyển sang báo phí/hợp đồng.

Acceptance criteria:
- Không thể gửi hợp đồng nếu chưa conflict clear.
- Audit log ghi người kiểm tra và kết quả.

### Bước 4 - Báo phí và hợp đồng dịch vụ pháp lý

Nguồn nghiệp vụ: Mẫu 02 và Mẫu 07.

Mục tiêu: tự động tạo báo phí/hợp đồng từ dữ liệu khách hàng.

Tính năng:
- Chọn gói dịch vụ: Basic, Pro, Premium, Enterprise.
- Tạo báo phí PDF/DOCX.
- Tạo hợp đồng từ template.
- Gửi email cho khách.
- Upload bản đã ký hoặc tích hợp e-sign sau.
- Ghi payment milestone: tạm ứng, còn lại.

Cần chuẩn hóa trước khi code:
- Rà lại lỗi Bên A/Bên B trong hợp đồng.
- Thống nhất phí: 5.000.000, 5.400.000 VAT, hoặc gói theo phạm vi.
- Thêm điều khoản AI chỉ hỗ trợ, luật sư duyệt cuối.
- Thêm điều khoản xử lý dữ liệu và bảo mật.

Acceptance criteria:
- Case không mở chính thức nếu chưa có hợp đồng hoặc admin override.
- Hợp đồng có mã hồ sơ và mã báo giá.

### Bước 5 - Sinh mã hồ sơ và tạo Google Drive

Nguồn nghiệp vụ: ý tưởng ban đầu của anh + quy trình nội bộ.

Mục tiêu: mỗi khách hàng có một hồ sơ chuẩn.

Tính năng:
- Sinh mã DN-YYYYMMDD-00001.
- Tạo slug tên công ty.
- Tạo folder Drive DN-YYYYMMDD-00001_COMPANYSLUG.
- Tạo subfolder chuẩn.
- Lưu folder_id vào database.
- Ghi Sheet vận hành nếu cần.

Gateway:
- Nếu Drive API lỗi -> case vẫn lưu database, trạng thái drive_pending, có job retry.
- Không để mất case chỉ vì lỗi Drive.

Acceptance criteria:
- Tạo đầy đủ folder/subfolder.
- Không trùng mã hồ sơ.
- Có audit log tạo folder.

### Bước 6 - Customer Upload Portal và checklist tài liệu

Nguồn nghiệp vụ: Mẫu 03, Mẫu 05, Mẫu 06.

Mục tiêu: khách hàng upload tài liệu theo checklist thay vì gửi rời rạc qua Zalo.

Nhóm tài liệu:
- Thông tin doanh nghiệp.
- Pháp lý doanh nghiệp.
- Thuế/kế toán.
- Lao động/BHXH.
- Hợp đồng/thương mại.
- Đầu tư/M&A nếu có.
- SHTT/tài sản số.
- Tranh chấp/tố tụng.
- Hệ thống quản lý.

Tính năng:
- Upload nhiều file.
- Kiểm tra định dạng, dung lượng, virus nếu có.
- Tự đổi tên file theo mã hồ sơ.
- Lưu vào đúng folder Drive.
- Lưu metadata trong database.
- Checklist hiển thị đủ/thiếu.

Acceptance criteria:
- File upload xong phải có document record.
- Không upload file nguy hiểm.
- Khách hàng thấy tiến độ tài liệu.

### Bước 7 - Kế hoạch khảo sát và phân công nhân sự

Nguồn nghiệp vụ: Mẫu 03 - Kế hoạch khảo sát.

Mục tiêu: biến kế hoạch khảo sát thành task/calendar.

Tính năng:
- Chọn hình thức online/offline.
- Chọn thời gian, địa điểm, link map/meeting.
- Chọn luật sư/chuyên viên tham gia.
- Chọn nội dung khảo sát.
- Gửi kế hoạch cho khách hàng.
- Tạo task nội bộ.

Acceptance criteria:
- Có survey_plan gắn với case.
- Có danh sách người tham gia.
- Có checklist chuẩn bị của khách hàng và luật sư.

### Bước 8 - Phiếu khảo sát và biên bản khảo sát số

Nguồn nghiệp vụ: Mẫu 04 và Mẫu 05.

Mục tiêu: luật sư/chuyên viên ghi nhận khảo sát ngay trên hệ thống.

Form khảo sát nên chia nhóm:
- Thông tin cơ bản doanh nghiệp.
- Pháp luật doanh nghiệp.
- Lao động/BHXH.
- Thương mại/hợp đồng.
- Đầu tư/M&A.
- Tranh chấp.
- Rủi ro hình sự/an ninh.
- Hệ thống quản lý.
- Tầm nhìn, sứ mệnh, văn hóa, giá trị.
- Khách hàng/kênh bán hàng/marketing.
- Doanh thu/IPO/nguồn lực.
- Ứng dụng AI và nội dung số.

Tính năng:
- Ghi chú theo từng câu hỏi.
- Đính kèm bằng chứng/tài liệu.
- Tạo biên bản khảo sát.
- Khách hàng ký xác nhận nếu cần.

Acceptance criteria:
- Biên bản xuất được DOCX/PDF.
- Mọi ghi chú có người tạo và thời gian.

### Bước 9 - OCR và phân loại tài liệu

Nguồn nghiệp vụ: ý tưởng AI OCR ban đầu.

Mục tiêu: biến tài liệu thành dữ liệu có thể phân tích.

Pipeline:
- Job OCR được tạo khi file upload.
- Extract text từ PDF/Word/Image.
- Detect loại tài liệu.
- Gán category.
- Tách field quan trọng: tên DN, MST, ngày cấp, người đại diện, điều khoản hợp đồng, mức lương, thời hạn, nghĩa vụ.
- Lưu bản text và JSON.

Gateway:
- Nếu OCR confidence thấp -> cần người kiểm tra.
- Nếu tài liệu thiếu trang/mờ -> yêu cầu upload lại.

Acceptance criteria:
- 80% tài liệu phổ biến được phân loại đúng trong MVP test.
- Có màn hình sửa phân loại thủ công.

### Bước 10 - AI Legal Analysis Engine

Mục tiêu: tạo bản nháp phân tích để luật sư duyệt.

Input:
- Survey request.
- Survey minutes.
- OCR text.
- Extracted fields.
- Document category.
- Checklist pháp lý.

Output mỗi finding:
- Mã finding.
- Nhóm rủi ro.
- Mô tả vấn đề.
- Bằng chứng từ tài liệu.
- Căn cứ pháp luật cần kiểm tra.
- Mức độ rủi ro: low/medium/high/critical.
- Khuyến nghị.
- Confidence score.
- Cờ cần luật sư kiểm tra.

Nhóm phân tích:
- Doanh nghiệp/quản trị.
- Điều lệ/cổ đông/thành viên.
- Giấy phép/ngành nghề.
- Thuế/kế toán.
- Lao động/BHXH.
- Hợp đồng/thương mại.
- Đầu tư/M&A.
- SHTT/tài sản số.
- Dữ liệu cá nhân/bảo mật.
- Tranh chấp/tố tụng.
- Tuân thủ nội bộ.
- Hệ thống quản lý.

Acceptance criteria:
- AI không được tạo finding không có evidence.
- AI output phải là JSON schema hợp lệ.
- Mọi finding AI đều ở trạng thái draft.

### Bước 11 - AI Checker và kiểm chéo

Mục tiêu: giảm lỗi AI trước khi luật sư xem.

Checker questions:
- Có bỏ sót nhóm tài liệu không?
- Có finding nào không có chứng cứ không?
- Có viện dẫn luật không chắc chắn không?
- Có xếp sai mức độ rủi ro không?
- Có mâu thuẫn giữa tài liệu và kết luận không?
- Có cần yêu cầu bổ sung tài liệu không?

Output:
- pass/fail.
- danh sách cảnh báo.
- confidence điều chỉnh.
- yêu cầu bổ sung.

Acceptance criteria:
- Finding bị checker fail không được đưa thẳng vào báo cáo final.
- Lawyer portal hiển thị rõ AI draft và checker note.

### Bước 12 - Lawyer Review Portal

Mục tiêu: luật sư duyệt mọi kết luận pháp lý.

Tính năng:
- Danh sách finding theo mức độ rủi ro.
- Mở tài liệu gốc cạnh finding.
- Chấp nhận/sửa/từ chối finding.
- Thêm căn cứ pháp luật.
- Ghi note nội bộ.
- Yêu cầu bổ sung tài liệu.
- Duyệt báo cáo.

Gateway:
- Không có báo cáo final nếu chưa có lawyer approval.
- Critical risk nên cần partner review.

Acceptance criteria:
- Mỗi finding final có người duyệt.
- Có audit log ai sửa gì, lúc nào.

### Bước 13 - Report Builder

Nguồn nghiệp vụ: Mẫu 06 - Báo cáo khảo sát.

Mục tiêu: tạo báo cáo chuyên nghiệp hơn mẫu hiện tại.

Cấu trúc báo cáo final:
1. Trang bìa.
2. Thông tin doanh nghiệp.
3. Phạm vi khảo sát.
4. Phương pháp khảo sát.
5. Executive Summary.
6. Tổng điểm sức khỏe pháp lý.
7. Bản đồ rủi ro.
8. Kết quả theo từng nhóm.
9. Bảng finding: vấn đề, thực trạng, đánh giá pháp lý, mức độ, đề xuất.
10. Checklist cần xử lý.
11. Roadmap 30 ngày.
12. Roadmap 60 ngày.
13. Roadmap 90 ngày.
14. Phụ lục tài liệu đã rà soát.
15. Disclaimer và bảo mật.

Acceptance criteria:
- Xuất DOCX/PDF.
- Có version: AI draft, lawyer draft, final.
- Final bị khóa sau khi phát hành.

### Bước 14 - Customer Delivery và Roadmap 30-90 ngày

Mục tiêu: biến báo cáo thành cơ hội tư vấn thường xuyên.

Tính năng:
- Gửi báo cáo qua portal/email.
- Khách hàng xem checklist.
- Roadmap có việc, mức độ ưu tiên, deadline, người phụ trách.
- Tạo đề xuất hợp đồng tư vấn thường xuyên.
- Theo dõi trạng thái follow-up.

Acceptance criteria:
- Khách hàng nhận được report.
- Intake thấy cơ hội upsell/retainer.

## 12. Gói dịch vụ đề xuất

Basic:
- Pháp lý doanh nghiệp, lao động cơ bản, hợp đồng mẫu, báo cáo ngắn.

Pro:
- Thêm thuế, BHXH, hợp đồng thương mại, checklist xử lý.

Premium:
- Thêm SHTT, tranh chấp, giấy phép ngành nghề, AI OCR, luật sư review sâu, roadmap 90 ngày.

Enterprise:
- Nhiều chi nhánh, nhiều phòng ban, dashboard riêng, workshop với ban lãnh đạo, theo dõi định kỳ.

## 13. Roadmap triển khai 90 ngày

Tuần 1:
- Chốt tên product, scope MVP, chuẩn hóa biểu mẫu, sửa lỗi hợp đồng.
- Viết Product Requirement Document.

Tuần 2:
- Dựng repo, CI, database schema, auth, roles.
- Dựng landing page và intake form.

Tuần 3:
- Xác thực email/SĐT, lead management, conflict check.
- Tạo dashboard intake.

Tuần 4:
- Proposal/contract generator bản đầu.
- Payment tracking thủ công.

Tuần 5:
- Sinh mã hồ sơ, tạo Google Drive folder/subfolder.
- Đồng bộ Google Sheet vận hành nếu cần.

Tuần 6:
- Customer upload portal, checklist tài liệu, file metadata.
- Quy tắc đổi tên file theo mã hồ sơ.

Tuần 7:
- Survey plan, phân công nhân sự, calendar/task.
- Phiếu khảo sát số và biên bản số.

Tuần 8:
- OCR worker MVP cho PDF/Word/Image.
- Phân loại tài liệu thủ công + AI hỗ trợ.

Tuần 9:
- AI extraction JSON schema.
- Màn hình sửa dữ liệu trích xuất.

Tuần 10:
- AI legal analysis draft theo nhóm rủi ro.
- AI checker bản đầu.

Tuần 11:
- Lawyer review portal.
- Finding approval, reject, edit, request more documents.

Tuần 12:
- Report builder DOCX/PDF.
- Report versioning, final approval.

Tuần 13:
- Customer delivery portal.
- Checklist và roadmap 30-90 ngày.
- QA end-to-end với 3 hồ sơ doanh nghiệp mẫu.

## 14. Bộ prompt cho AI/dev team thực hiện từng phần

Prompt 1 - Product spec:
Hãy đọc blueprint Legal360 này và tạo Product Requirement Document cho MVP gồm scope, user roles, user stories, data model, API list, acceptance criteria và risk list. Không thêm tính năng ngoài scope MVP.

Prompt 2 - Database:
Từ data model Legal360, hãy tạo Prisma schema/Postgres schema đầy đủ cho users, organizations, contacts, cases, documents, survey_requests, survey_plans, ai_runs, legal_findings, reviews, reports, audit_logs. Mỗi bảng cần primary key, foreign key, enum status, created_at, updated_at.

Prompt 3 - API contract:
Tạo API contract REST/JSON cho toàn bộ workflow: lead, verify, conflict check, proposal, contract, case, drive folder, upload, OCR job, AI analysis, lawyer review, report export, roadmap. Mỗi endpoint có request, response, error cases, permission.

Prompt 4 - Frontend:
Tạo Next.js App Router UI cho Legal360 gồm landing page, customer intake form, customer upload portal, admin dashboard, lawyer review portal. UI tiếng Việt, chuyên nghiệp, không giống landing page demo rẻ tiền.

Prompt 5 - Google Drive:
Viết module tích hợp Google Drive API: create case folder, create subfolders, upload file, move file, rename file, get share link, store folder_id/file_id vào database, retry khi lỗi.

Prompt 6 - OCR worker:
Viết Python worker nhận document_id, tải file, OCR/extract text, phân loại tài liệu, lưu OCR text, extracted JSON, confidence, lỗi nếu file không đọc được.

Prompt 7 - AI legal analysis:
Thiết kế prompt và JSON schema để AI phân tích hồ sơ doanh nghiệp theo nhóm pháp lý, bắt buộc có evidence, căn cứ cần kiểm tra, mức độ rủi ro, khuyến nghị, confidence. Không cho phép kết luận không có chứng cứ.

Prompt 8 - Lawyer review:
Xây dựng workflow lawyer review: accept/edit/reject finding, add legal basis, request more documents, approve report. Không cho xuất báo cáo final nếu chưa approve.

Prompt 9 - Report generator:
Tạo report generator từ template Mẫu 06 nâng cấp, xuất DOCX/PDF gồm executive summary, risk map, bảng finding, checklist, roadmap 30-90 ngày, phụ lục tài liệu.

Prompt 10 - QA:
Tạo test plan end-to-end cho Legal360 từ đăng ký khách hàng đến xuất báo cáo final, gồm test happy path, missing document, OCR fail, AI low confidence, lawyer reject, Drive API fail, permission test.

## 15. Tiêu chí “hoạt động tốt nhất” trước khi bán thật

1. Một khách hàng có thể đăng ký, xác thực và tạo hồ sơ trong dưới 5 phút.
2. Hệ thống sinh mã hồ sơ không trùng.
3. Folder Drive tạo đúng cấu trúc.
4. Upload tài liệu không bị thất lạc.
5. Mọi file có metadata trong database.
6. AI OCR lỗi thì có retry và fallback thủ công.
7. AI finding không có evidence thì không được vào báo cáo.
8. Báo cáo cuối bắt buộc có luật sư duyệt.
9. Có audit log cho upload, AI, review, export.
10. Có phân quyền giữa khách hàng, intake, luật sư, admin.
11. Có version báo cáo.
12. Có quy trình bổ sung tài liệu.
13. Có backup database và Drive metadata.
14. Có checklist QA cho từng hồ sơ.
15. Có dashboard theo dõi trạng thái và SLA.

## 16. Kết luận triển khai

Product này triển khai được thực tế. Bộ tài liệu hiện có là nền nghiệp vụ tốt, đặc biệt cho một công ty luật muốn số hóa dịch vụ khảo sát doanh nghiệp. Cách làm an toàn nhất là không triển khai ngay một AI tư vấn pháp lý hoàn toàn, mà triển khai Legal360 như một hệ thống vận hành dịch vụ: AI hỗ trợ OCR, tóm tắt, phân loại và tạo bản nháp rủi ro; luật sư duyệt cuối; hệ thống quản lý hồ sơ, tài liệu, báo cáo và follow-up.

MVP nên đi theo thứ tự: landing + intake + hợp đồng + mã hồ sơ + Drive + upload + survey plan + biên bản + báo cáo thủ công. Sau khi workflow chạy ổn mới thêm OCR, AI phân tích, AI checker và confidence score. Làm như vậy giống một team dev thật sự: lấy nghiệp vụ đang có, biến thành data model, workflow, UI, API, worker, QA và triển khai từng sprint có kiểm thử.


## 17. Nguồn kỹ thuật tham khảo cho stack triển khai

Các lựa chọn kỹ thuật trong blueprint nên được xác nhận lại khi team bắt đầu triển khai, nhưng hiện tại có thể dùng các nguồn chính thức sau làm điểm xuất phát:

- Next.js App Router: dùng cho web app, customer portal, lawyer portal và admin dashboard. Tài liệu chính thức: https://nextjs.org/docs/app
- Google Drive API: dùng để tạo folder hồ sơ, subfolder và lưu file theo folder_id. Tài liệu chính thức về folder: https://developers.google.com/workspace/drive/api/guides/folder
- Supabase/Postgres: dùng làm database MVP nếu muốn triển khai nhanh với Postgres, auth/storage tùy chọn và RLS. Tài liệu chính thức: https://supabase.com/docs
- Azure Document Intelligence: một lựa chọn OCR/document extraction cho PDF, ảnh scan và tài liệu số. Tài liệu chính thức: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/read

