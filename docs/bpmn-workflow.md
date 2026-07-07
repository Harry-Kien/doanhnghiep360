# LEGAL360 — BPMN Workflow

Sơ đồ nguồn: `legal360-bpmn-workflow.mmd` (Mermaid). Tài liệu này mô tả lane, gateway và
ánh xạ trạng thái ↔ next action để UI luôn hiển thị "việc tiếp theo".

## Lanes

1. **Khách hàng** — landing → phiếu yêu cầu → xác thực OTP → ký HĐ + thanh toán → upload → khảo sát → nhận báo cáo + roadmap.
2. **Intake/Sales/Legal Ops** — nhận lead → kiểm tra → conflict check → báo phí/HĐ → theo dõi ký & thanh toán → phân công.
3. **CRM/Database/Workflow** — tạo lead → org/contact → sinh mã hồ sơ → tạo case → status history → task/checklist → audit log.
4. **Google Drive/Document Store** — tạo folder/subfolder → nhận upload → đổi tên → lưu metadata `file_id/folder_id`.
5. **AI Processing** — OCR → extract → classify → analysis draft → AI checker → confidence → gate "đủ tin cậy?".
6. **Luật sư/Reviewer** — xem gốc + AI draft → accept/edit/reject → gate "cần bổ sung?" → duyệt báo cáo → khóa final.
7. **Báo cáo/CSKH** — sinh DOCX/PDF → dashboard → checklist → roadmap 30-90 → gửi khách → đề xuất retainer.

## Gateways (điểm quyết định)

| Gateway | Điều kiện | Nhánh |
|---|---|---|
| Conflict | Có xung đột lợi ích? | Có → reject/partner duyệt; Không → báo phí |
| AI confidence | Đủ tin cậy? | Không → manual review/bổ sung; Có → lawyer review |
| Lawyer docs | Cần bổ sung tài liệu? | Có → request bổ sung (về lane KH upload); Không → duyệt báo cáo |
| Evidence gate | Finding có evidence? | Không → loại khỏi final; Có → đưa vào báo cáo |
| Approval gate | Đã có lawyer approval? | Không → chặn export final; Có → khóa final |

## Trạng thái → Next action (dùng cho UI "next action rõ ràng")

| Status | Lane chủ | Next action hiển thị |
|---|---|---|
| `lead_new` | Intake | Kiểm tra thông tin, xác thực KH |
| `lead_verified` | Intake | Chạy conflict check |
| `conflict_checking` | Intake | Nhập kết quả conflict |
| `conflict_cleared` | Intake | Gửi báo phí + hợp đồng |
| `proposal_sent` | KH/Intake | Chờ khách phản hồi báo phí |
| `contract_pending` | KH | Khách ký hợp đồng |
| `payment_pending` | KH/Accountant | Xác nhận thanh toán/tạm ứng |
| `case_opened` | System | Sinh mã hồ sơ + tạo Drive |
| `waiting_documents` | KH | Khách upload theo checklist |
| `documents_received` | Staff | Kiểm tra tài liệu |
| `document_reviewing` | Staff | Đối chiếu checklist |
| `need_more_documents` | KH | Khách bổ sung tài liệu thiếu |
| `ocr_processing` | AI | Đang OCR (chờ) |
| `ai_classifying` | AI | Đang phân loại (chờ) |
| `ai_analyzing` | AI | Đang phân tích rủi ro (chờ) |
| `lawyer_reviewing` | Lawyer | Luật sư duyệt finding |
| `report_drafting` | Lawyer/Report | Soạn báo cáo |
| `report_revision` | Lawyer | Chỉnh sửa theo review |
| `approved` | Reviewer | Khóa final + xuất file |
| `delivered` | CSKH | Đã gửi khách; theo dõi |
| `roadmap_followup` | CSKH | Theo dõi roadmap 30-90 |
| `retainer_proposed` | Intake | Đề xuất hợp đồng thường xuyên |
| `completed` | — | Hoàn tất |
| `cancelled` | — | Đã hủy |

## State machine (tóm tắt chuyển hợp lệ)

Định nghĩa chính xác trong `src/shared/status.ts` (`CASE_STATUS_TRANSITIONS`). Nguyên tắc:

- Đường "happy path" đi tuần tự theo bảng trên.
- `need_more_documents` có thể quay lại từ `document_reviewing`, `lawyer_reviewing`.
- `report_revision` ↔ `lawyer_reviewing`.
- `cancelled` đạt được từ hầu hết trạng thái trước `delivered` (trừ `completed`).
- Không cho nhảy lùi về `lead_*` sau khi `case_opened`.
