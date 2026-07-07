import { NextRequest } from "next/server";
import { approveAndExportFinal, ReportGuardError } from "@/server/services/report-build";
import { EvidenceRequiredError, LawyerApprovalRequiredError } from "@/server/services/report";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

const ALLOWED = new Set(["lawyer", "reviewer", "admin"]);

// POST /api/cases/:id/report/approve — duyệt & xuất báo cáo final (khóa bản cuối).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!ALLOWED.has(viewer.role)) return fail("FORBIDDEN", "Chỉ luật sư/reviewer được duyệt báo cáo final.");
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không được phân công xử lý hồ sơ này.");
  }
  try {
    const final = await approveAndExportFinal(params.id, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok({ versionId: final.id, version: final.version, docxDocId: final.docxDocId, pdfDocId: final.pdfDocId });
  } catch (err) {
    if (err instanceof ReportGuardError) return fail("STATE_TRANSITION_INVALID", err.message);
    if (err instanceof EvidenceRequiredError) return fail("EVIDENCE_REQUIRED", err.message);
    if (err instanceof LawyerApprovalRequiredError) return fail("LAWYER_APPROVAL_REQUIRED", err.message);
    return fail("INTERNAL_ERROR", "Không thể xuất báo cáo final.");
  }
}
