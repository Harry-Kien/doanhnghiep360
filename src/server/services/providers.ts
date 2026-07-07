// Tổng hợp trạng thái provider cho trang chẩn đoán admin.
import { env } from "@/lib/env";
import { getDriveStatus } from "@/server/adapters/drive";
import { getEmailStatus } from "@/server/adapters/email";
import { isAiConfigured, aiModelLabel, effectiveOcrProvider } from "@/server/services/settings";

export interface ProviderStatusRow {
  key: string;
  label: string;
  mode: string;
  configured: boolean;
  reason: string;
}

export function getProvidersStatus(): ProviderStatusRow[] {
  const drive = getDriveStatus();
  const email = getEmailStatus();
  return [
    { key: "drive", label: "Google Drive", mode: drive.mode, configured: drive.configured, reason: drive.reason },
    { key: "email", label: "Email (OTP & thông báo)", mode: email.mode, configured: email.configured, reason: email.reason },
    (() => {
      const ocr = effectiveOcrProvider();
      return {
        key: "ocr",
        label: "OCR / trích xuất tài liệu",
        mode: ocr,
        configured: ocr === "local" || ocr === "gemini",
        reason:
          ocr === "gemini"
            ? "Trích text PDF/DOCX (local) + OCR ẢNH (jpg/png) bằng Gemini vision."
            : ocr === "local"
              ? "Trích text THẬT từ PDF (text layer) + DOCX. Ảnh scan: chọn OCR_PROVIDER=gemini."
              : "Chưa cấu hình OCR thật. Cài trong Admin: OCR=local (PDF/DOCX) hoặc gemini (thêm OCR ảnh).",
      };
    })(),
    {
      key: "ai",
      label: "AI rà soát pháp lý",
      mode: isAiConfigured() ? aiModelLabel() : "mock",
      configured: isAiConfigured(),
      reason: isAiConfigured()
        ? `Dùng ${aiModelLabel()} phân tích nội dung tài liệu thật, output JSON, bắt buộc evidence.`
        : "Chưa cấu hình AI thật. Cài key trong Admin → Cấu hình hệ thống (Gemini miễn phí hoặc Claude).",
    },
    {
      key: "report",
      label: "Xuất báo cáo DOCX/HTML",
      mode: "internal",
      configured: true,
      reason: "Sinh báo cáo thật từ dữ liệu đã được luật sư duyệt; DOCX tải trực tiếp, HTML dùng để xem/in PDF.",
    },
    {
      key: "sheet",
      label: "Google Sheet (theo dõi phụ)",
      mode: env.google.sheetId ? "configured" : "optional",
      configured: Boolean(env.google.sheetId),
      reason: env.google.sheetId ? "Đã có GOOGLE_SHEET_ID." : "Tùy chọn chưa bật. Database là source of truth.",
    },
  ];
}
