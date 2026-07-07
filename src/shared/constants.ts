// Hằng số nghiệp vụ dùng chung.

/** 12 nhóm folder Google Drive theo blueprint (mục 5). */
export const DRIVE_SUBFOLDERS = [
  { key: "survey_request_form", name: "00.Phieu_yeu_cau_khao_sat", label: "Phiếu yêu cầu khảo sát đã điền" },
  { key: "00", name: "00.Hop_dong_va_thanh_toan", label: "Hợp đồng & thanh toán" },
  { key: "01", name: "01.Thong_tin_doanh_nghiep", label: "Thông tin doanh nghiệp" },
  { key: "02", name: "02.Phap_ly_doanh_nghiep", label: "Pháp lý doanh nghiệp" },
  { key: "03", name: "03.Thue_ke_toan", label: "Thuế / kế toán" },
  { key: "04", name: "04.Lao_dong_BHXH", label: "Lao động / BHXH" },
  { key: "05", name: "05.Hop_dong_thuong_mai", label: "Hợp đồng thương mại" },
  { key: "06", name: "06.SHTT_tai_san_so", label: "SHTT / tài sản số" },
  { key: "07", name: "07.Tranh_chap_to_tung", label: "Tranh chấp / tố tụng" },
  { key: "08", name: "08.He_thong_quan_ly", label: "Hệ thống quản lý" },
  { key: "09", name: "09.AI_OCR_va_phan_tich", label: "AI OCR & phân tích" },
  { key: "10", name: "10.Ket_qua_bao_cao", label: "Kết quả & báo cáo" },
  { key: "99", name: "99.Luu_tru_noi_bo", label: "Lưu trữ nội bộ" },
] as const;

export type DriveSubfolderKey = (typeof DRIVE_SUBFOLDERS)[number]["key"];

export const SURVEY_REQUEST_FORM_CATEGORY = {
  key: "survey_request_form",
  label: "Phiếu yêu cầu khảo sát đã điền",
  required: true,
  hint: "Tải Mẫu 01, điền đầy đủ thông tin doanh nghiệp, mục tiêu khảo sát, yêu cầu đặc biệt, người liên hệ và thời gian dự kiến rồi upload lại dưới dạng DOCX/PDF.",
} as const;

/**
 * Checklist tài liệu khách hàng cần upload (ánh xạ tới nhóm Drive 01–08).
 * required = bắt buộc để chuyển sang xử lý. hint = gợi ý cụ thể khách cần nộp file gì.
 * Đối chiếu quy trình khảo sát DN 360 (Mẫu 01–07 + phụ lục).
 */
export const DOCUMENT_CHECKLIST = [
  SURVEY_REQUEST_FORM_CATEGORY,
  { key: "01", label: "Thông tin doanh nghiệp", required: true, hint: "Giấy giới thiệu, sơ đồ tổ chức, danh sách cổ đông/thành viên góp vốn, người đại diện theo pháp luật" },
  { key: "02", label: "Pháp lý doanh nghiệp", required: true, hint: "GCN đăng ký doanh nghiệp, điều lệ, biên bản/nghị quyết họp, giấy phép con (ngành nghề có điều kiện)" },
  { key: "03", label: "Thuế / kế toán", required: true, hint: "Báo cáo tài chính 2–3 năm gần nhất, tờ khai thuế GTGT/TNDN, tình hình nợ thuế" },
  { key: "04", label: "Lao động / BHXH", required: true, hint: "HĐLĐ mẫu, nội quy lao động, thang bảng lương, hồ sơ đăng ký BHXH" },
  { key: "05", label: "Hợp đồng thương mại", required: false, hint: "Hợp đồng mua bán/dịch vụ tiêu biểu, điều khoản giao dịch chung với đối tác" },
  { key: "06", label: "SHTT / tài sản số", required: false, hint: "Giấy chứng nhận nhãn hiệu, bản quyền, sáng chế, tên miền, phần mềm" },
  { key: "07", label: "Tranh chấp / tố tụng", required: false, hint: "Hồ sơ vụ việc, đơn khởi kiện, bản án/quyết định, văn bản khiếu nại (nếu có)" },
  { key: "08", label: "Hệ thống quản lý", required: false, hint: "Quy chế nội bộ, quy trình vận hành, chính sách tuân thủ/kiểm soát" },
] as const;

/**
 * Nhóm tài liệu KHÁCH HÀNG được phép upload — khớp DOCUMENT_CHECKLIST.
 * Là nguồn chân lý cho cả UI (dropdown) lẫn validate backend.
 */
export const CUSTOMER_UPLOAD_KEYS: readonly string[] = DOCUMENT_CHECKLIST.map((d) => d.key);

/**
 * Nhóm CHỈ dùng nội bộ/hệ thống — khách KHÔNG được chọn upload:
 * 00 (hợp đồng & thanh toán), 09 (AI OCR & phân tích), 10 (kết quả & báo cáo), 99 (lưu trữ nội bộ).
 */
export const INTERNAL_ONLY_KEYS: readonly string[] = DRIVE_SUBFOLDERS.map((s) => s.key).filter(
  (k) => !CUSTOMER_UPLOAD_KEYS.includes(k),
);

/** Khách hàng có được phép upload vào nhóm này không? (internal roles thì luôn được nếu key hợp lệ). */
export function isCustomerUploadableKey(key: string | null | undefined): boolean {
  return key != null && CUSTOMER_UPLOAD_KEYS.includes(key);
}

/** Gói dịch vụ. */
export const SERVICE_PACKAGES = ["basic", "pro", "premium", "enterprise"] as const;
export type ServicePackage = (typeof SERVICE_PACKAGES)[number];

export const PACKAGE_META: Record<
  ServicePackage,
  { label: string; price: number; tagline: string; features: string[]; highlight?: boolean }
> = {
  basic: {
    label: "Basic",
    price: 5_000_000,
    tagline: "Sức khỏe pháp lý nền tảng",
    features: [
      "Pháp lý doanh nghiệp",
      "Lao động cơ bản",
      "Rà hợp đồng mẫu",
      "Báo cáo khảo sát rút gọn",
    ],
  },
  pro: {
    label: "Pro",
    price: 12_000_000,
    tagline: "Mở rộng thuế & thương mại",
    features: [
      "Toàn bộ gói Basic",
      "Thuế / kế toán, BHXH",
      "Hợp đồng thương mại",
      "Checklist xử lý rủi ro",
    ],
    highlight: true,
  },
  premium: {
    label: "Premium",
    price: 25_000_000,
    tagline: "Khảo sát chuyên sâu + AI",
    features: [
      "Toàn bộ gói Pro",
      "SHTT, tranh chấp, giấy phép ngành",
      "AI OCR + luật sư review sâu",
      "Roadmap 90 ngày chi tiết",
    ],
  },
  enterprise: {
    label: "Enterprise",
    price: 0, // liên hệ
    tagline: "Tập đoàn / nhiều chi nhánh",
    features: [
      "Nhiều chi nhánh, nhiều phòng ban",
      "Dashboard riêng",
      "Workshop với ban lãnh đạo",
      "Theo dõi định kỳ",
    ],
  },
};

/** Mức độ rủi ro. */
export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_META: Record<RiskLevel, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  low: { label: "Thấp", tone: "success" },
  medium: { label: "Trung bình", tone: "warning" },
  high: { label: "Cao", tone: "danger" },
  critical: { label: "Nghiêm trọng", tone: "danger" },
};

/** Phạm vi khảo sát (landing + survey form). */
export const SURVEY_SCOPE = [
  { key: "corporate", label: "Pháp lý doanh nghiệp", desc: "Điều lệ, cổ đông, giấy phép, quản trị" },
  { key: "labor", label: "Lao động / BHXH", desc: "HĐLĐ, nội quy, bảo hiểm, tranh chấp lao động" },
  { key: "tax", label: "Thuế / kế toán", desc: "Tuân thủ thuế, rủi ro hóa đơn, BCTC" },
  { key: "commercial", label: "Hợp đồng thương mại", desc: "Rủi ro điều khoản, nghĩa vụ, phạt vi phạm" },
  { key: "investment", label: "Đầu tư / M&A", desc: "Cấu trúc đầu tư, giấy phép, điều kiện" },
  { key: "ip", label: "SHTT / tài sản số", desc: "Nhãn hiệu, bản quyền, dữ liệu, tên miền" },
  { key: "dispute", label: "Tranh chấp / tố tụng", desc: "Vụ việc tiềm ẩn, nghĩa vụ tố tụng" },
  { key: "management", label: "Hệ thống quản lý", desc: "Quy chế nội bộ, tuân thủ, kiểm soát" },
] as const;

export const VND = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

/**
 * Thông tin chuyển khoản hiển thị cho khách trong cổng khách hàng.
 * ⚠️ SỬA các giá trị dưới đây thành số tài khoản THẬT của công ty trước khi triển khai.
 */
export const PAYMENT_INSTRUCTIONS = {
  bankName: "Vietcombank — CN TP.HCM",
  accountName: "LUẬT NGỌC SƠN",
  accountNumber: "9382140336",
  noteHint: "Ghi nội dung chuyển khoản: [Mã hồ sơ] [Tên doanh nghiệp]",
} as const;

export const BUSINESS_TYPES = [
  "Công ty TNHH một thành viên",
  "Công ty TNHH hai thành viên trở lên",
  "Công ty cổ phần",
  "Doanh nghiệp tư nhân",
  "Công ty hợp danh",
  "Hộ kinh doanh",
  "Chi nhánh / VPĐD",
  "Khác",
] as const;
