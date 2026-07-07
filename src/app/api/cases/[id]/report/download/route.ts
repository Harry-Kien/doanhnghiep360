import { NextRequest } from "next/server";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { getReportView } from "@/server/services/report-build";
import { buildReportModel, generateReportDocx, renderReportHtml } from "@/server/services/report-doc";
import { fail } from "@/lib/http";

// GET /api/cases/:id/report/download?format=docx|html — xuất báo cáo thật từ dữ liệu đã thẩm định.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");

  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không có quyền truy cập báo cáo của hồ sơ này.");
  }

  // Khách hàng chỉ tải khi đã có báo cáo final được phê duyệt; nội bộ xem được bản dựng hiện tại.
  if (viewer.role === "customer") {
    const { versions } = getReportView(params.id);
    if (!versions.some((v) => v.kind === "final")) {
      return fail("FORBIDDEN", "Báo cáo chưa được phê duyệt phát hành.");
    }
  }

  const model = buildReportModel(params.id);
  if (!model) return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");

  const format = req.nextUrl.searchParams.get("format") === "docx" ? "docx" : "html";
  const baseName = `BaoCao_${model.caseCode}`;

  try {
    if (format === "docx") {
      const buf = await generateReportDocx(model);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Length": String(buf.length),
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}.docx`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    // HTML: mở để xem & in PDF (inline).
    return new Response(renderReportHtml(model), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  } catch {
    return fail("INTERNAL_ERROR", "Không thể tạo báo cáo.");
  }
}
