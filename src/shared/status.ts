// Single source of truth for Legal360 case statuses and transitions.
// Keep legacy statuses while adding the Doanh nghiep 360 survey path.

export const CASE_STATUSES = [
  "lead_new",
  "info_form_sent",
  "info_form_uploaded",
  "lead_verified",
  "conflict_checking",
  "conflict_cleared",
  "proposal_sent",
  "contract_pending",
  "payment_pending",
  "case_opened",
  "waiting_documents",
  "documents_received",
  "online_meeting_scheduled",
  "online_meeting_done",
  "checklist_in_progress",
  "onsite_survey_scheduled",
  "onsite_survey_done",
  "document_reviewing",
  "need_more_documents",
  "ocr_processing",
  "ai_classifying",
  "ai_analyzing",
  "lawyer_analysis",
  "lawyer_reviewing",
  "report_drafting",
  "report_sent_to_customer",
  "explanation_meeting_done",
  "report_revision",
  "reviewer_approval",
  "final_report_ready",
  "approved",
  "delivered",
  "roadmap_followup",
  "retainer_proposal_sent",
  "retainer_proposed",
  "completed",
  "cancelled",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export type StatusGroup =
  | "lead"
  | "commercial"
  | "intake_docs"
  | "meeting"
  | "survey"
  | "ai"
  | "review"
  | "delivery"
  | "closed";

interface StatusMeta {
  label: string;
  group: StatusGroup;
  ownerLane: "customer" | "intake" | "staff" | "ai" | "lawyer" | "reviewer" | "accountant" | "cskh" | "system" | "none";
  nextAction: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger" | "purple";
}

export const CASE_STATUS_META: Record<CaseStatus, StatusMeta> = {
  lead_new: { label: "Lead mới", group: "lead", ownerLane: "intake", nextAction: "Tiếp nhận yêu cầu khảo sát và tạo hồ sơ ban đầu", tone: "info" },
  info_form_sent: { label: "Đã gửi phiếu yêu cầu", group: "intake_docs", ownerLane: "customer", nextAction: "Khách tải phiếu, điền thông tin và upload lại", tone: "warning" },
  info_form_uploaded: { label: "Đã nhận phiếu", group: "intake_docs", ownerLane: "intake", nextAction: "Kiểm tra phiếu, tài liệu và chuẩn bị lịch họp online", tone: "info" },
  lead_verified: { label: "Đã xác thực", group: "lead", ownerLane: "intake", nextAction: "Chạy conflict check", tone: "info" },
  conflict_checking: { label: "Đang kiểm tra xung đột", group: "lead", ownerLane: "intake", nextAction: "Nhập kết quả conflict check", tone: "warning" },
  conflict_cleared: { label: "Đã qua conflict", group: "lead", ownerLane: "intake", nextAction: "Gửi báo phí và hợp đồng", tone: "success" },
  proposal_sent: { label: "Đã gửi báo phí", group: "commercial", ownerLane: "customer", nextAction: "Chờ khách phản hồi báo phí", tone: "info" },
  contract_pending: { label: "Chờ ký hợp đồng", group: "commercial", ownerLane: "customer", nextAction: "Khách ký hợp đồng dịch vụ", tone: "warning" },
  payment_pending: { label: "Chờ tạm ứng", group: "commercial", ownerLane: "accountant", nextAction: "Xác nhận tạm ứng hoặc thanh toán còn lại", tone: "warning" },
  case_opened: { label: "Đã mở hồ sơ", group: "intake_docs", ownerLane: "system", nextAction: "Sinh mã hồ sơ và tạo kho tài liệu", tone: "purple" },
  waiting_documents: { label: "Chờ tài liệu", group: "intake_docs", ownerLane: "customer", nextAction: "Khách upload phiếu và tài liệu theo checklist", tone: "warning" },
  documents_received: { label: "Đã nhận tài liệu", group: "intake_docs", ownerLane: "staff", nextAction: "Kiểm tra online trước hồ sơ", tone: "info" },
  online_meeting_scheduled: { label: "Đã lên lịch họp online", group: "meeting", ownerLane: "lawyer", nextAction: "Tổ chức họp online để hỏi chi tiết", tone: "info" },
  online_meeting_done: { label: "Đã họp online", group: "meeting", ownerLane: "staff", nextAction: "Cập nhật câu trả lời và tài liệu cần đối chiếu", tone: "success" },
  checklist_in_progress: { label: "Đang làm checklist", group: "survey", ownerLane: "staff", nextAction: "Hoàn thiện bộ câu hỏi chi tiết và mức rủi ro sơ bộ", tone: "warning" },
  onsite_survey_scheduled: { label: "Đã lên lịch khảo sát thực tế", group: "survey", ownerLane: "staff", nextAction: "Chuẩn bị thành phần, địa điểm và ghi chú khảo sát", tone: "info" },
  onsite_survey_done: { label: "Đã khảo sát thực tế", group: "survey", ownerLane: "staff", nextAction: "Gắn kết quả khảo sát với checklist và tài liệu", tone: "success" },
  document_reviewing: { label: "Đang kiểm tra tài liệu", group: "intake_docs", ownerLane: "staff", nextAction: "Đối chiếu checklist tài liệu và ghi chú nghiên cứu ban đầu", tone: "info" },
  need_more_documents: { label: "Cần bổ sung", group: "intake_docs", ownerLane: "customer", nextAction: "Khách bổ sung tài liệu còn thiếu", tone: "danger" },
  ocr_processing: { label: "Đang OCR", group: "ai", ownerLane: "ai", nextAction: "Hệ thống đang OCR tài liệu", tone: "purple" },
  ai_classifying: { label: "Đang phân loại", group: "ai", ownerLane: "ai", nextAction: "AI đang phân loại tài liệu", tone: "purple" },
  ai_analyzing: { label: "AI phân tích", group: "ai", ownerLane: "ai", nextAction: "AI phân tích sơ bộ, luật sư phải duyệt cuối", tone: "purple" },
  lawyer_analysis: { label: "Luật sư phân tích", group: "review", ownerLane: "lawyer", nextAction: "Luật sư tổng hợp vấn đề, rủi ro, căn cứ và đề xuất", tone: "warning" },
  lawyer_reviewing: { label: "Luật sư review", group: "review", ownerLane: "lawyer", nextAction: "Luật sư duyệt từng finding", tone: "warning" },
  report_drafting: { label: "Soạn báo cáo", group: "review", ownerLane: "lawyer", nextAction: "Soạn báo cáo khảo sát dựa trên vấn đề khách hàng", tone: "info" },
  report_sent_to_customer: { label: "Đã gửi báo cáo dự thảo", group: "delivery", ownerLane: "customer", nextAction: "Chờ khách xem và tham gia buổi giải trình", tone: "info" },
  explanation_meeting_done: { label: "Đã giải trình online", group: "delivery", ownerLane: "lawyer", nextAction: "Ghi nhận phản hồi hoặc yêu cầu chỉnh sửa của khách", tone: "success" },
  report_revision: { label: "Chỉnh sửa báo cáo", group: "review", ownerLane: "lawyer", nextAction: "Chỉnh sửa theo phản hồi và gửi reviewer duyệt lại", tone: "warning" },
  reviewer_approval: { label: "Chờ reviewer duyệt", group: "review", ownerLane: "reviewer", nextAction: "Reviewer/Partner duyệt cuối trước khi khóa final", tone: "warning" },
  final_report_ready: { label: "Báo cáo final sẵn sàng", group: "review", ownerLane: "cskh", nextAction: "Bàn giao báo cáo final và lưu version", tone: "success" },
  approved: { label: "Đã duyệt", group: "review", ownerLane: "reviewer", nextAction: "Khóa bản final và xuất file", tone: "success" },
  delivered: { label: "Đã bàn giao", group: "delivery", ownerLane: "cskh", nextAction: "Theo dõi giải trình, thanh toán còn lại và roadmap", tone: "success" },
  roadmap_followup: { label: "Theo dõi roadmap", group: "delivery", ownerLane: "cskh", nextAction: "Theo dõi roadmap 30/60/90 ngày", tone: "info" },
  retainer_proposal_sent: { label: "Đã đề xuất tư vấn thường xuyên", group: "delivery", ownerLane: "intake", nextAction: "Theo dõi hợp đồng tư vấn pháp luật thường xuyên/theo vụ việc", tone: "info" },
  retainer_proposed: { label: "Đã đề xuất retainer", group: "delivery", ownerLane: "intake", nextAction: "Theo dõi hợp đồng tư vấn pháp luật thường xuyên", tone: "info" },
  completed: { label: "Hoàn tất", group: "closed", ownerLane: "none", nextAction: "Hồ sơ đã hoàn tất", tone: "success" },
  cancelled: { label: "Đã hủy", group: "closed", ownerLane: "none", nextAction: "Hồ sơ đã hủy", tone: "neutral" },
};

export const CASE_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  lead_new: ["info_form_sent", "info_form_uploaded", "lead_verified", "cancelled"],
  info_form_sent: ["info_form_uploaded", "cancelled"],
  info_form_uploaded: ["online_meeting_scheduled", "lead_verified", "conflict_checking", "cancelled"],
  lead_verified: ["conflict_checking", "cancelled"],
  conflict_checking: ["conflict_cleared", "cancelled"],
  conflict_cleared: ["proposal_sent", "cancelled"],
  proposal_sent: ["contract_pending", "cancelled"],
  contract_pending: ["payment_pending", "cancelled"],
  payment_pending: ["case_opened", "cancelled"],
  case_opened: ["waiting_documents", "info_form_sent", "cancelled"],
  waiting_documents: ["documents_received", "info_form_uploaded", "need_more_documents", "cancelled"],
  documents_received: ["online_meeting_scheduled", "document_reviewing", "cancelled"],
  online_meeting_scheduled: ["online_meeting_done", "cancelled"],
  online_meeting_done: ["checklist_in_progress", "need_more_documents", "cancelled"],
  checklist_in_progress: ["onsite_survey_scheduled", "document_reviewing", "cancelled"],
  onsite_survey_scheduled: ["onsite_survey_done", "cancelled"],
  onsite_survey_done: ["document_reviewing", "cancelled"],
  document_reviewing: ["lawyer_analysis", "ocr_processing", "need_more_documents", "cancelled"],
  need_more_documents: ["info_form_uploaded", "documents_received", "cancelled"],
  ocr_processing: ["ai_classifying", "need_more_documents", "cancelled"],
  ai_classifying: ["ai_analyzing", "cancelled"],
  ai_analyzing: ["lawyer_analysis", "lawyer_reviewing", "cancelled"],
  lawyer_analysis: ["report_drafting", "lawyer_reviewing", "need_more_documents", "cancelled"],
  lawyer_reviewing: ["report_drafting", "need_more_documents", "cancelled"],
  report_drafting: ["report_sent_to_customer", "report_revision", "reviewer_approval", "approved", "cancelled"],
  report_sent_to_customer: ["explanation_meeting_done", "report_revision", "cancelled"],
  explanation_meeting_done: ["report_revision", "reviewer_approval", "final_report_ready", "cancelled"],
  report_revision: ["reviewer_approval", "lawyer_analysis", "lawyer_reviewing", "approved", "cancelled"],
  reviewer_approval: ["final_report_ready", "report_revision", "approved", "cancelled"],
  final_report_ready: ["delivered"],
  approved: ["final_report_ready", "delivered"],
  delivered: ["retainer_proposal_sent", "roadmap_followup", "completed"],
  roadmap_followup: ["retainer_proposal_sent", "retainer_proposed", "completed"],
  retainer_proposal_sent: ["completed"],
  retainer_proposed: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return CASE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isCaseStatus(value: string): value is CaseStatus {
  return (CASE_STATUSES as readonly string[]).includes(value);
}

export function isActiveStatus(status: CaseStatus): boolean {
  return CASE_STATUS_META[status].group !== "closed";
}
