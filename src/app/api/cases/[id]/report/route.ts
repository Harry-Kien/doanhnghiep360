import { NextRequest } from "next/server";
import { generateDraftReport } from "@/server/services/report-build";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

const ALLOWED = new Set(["lawyer", "reviewer", "admin"]);

// POST /api/cases/:id/report — tạo bản nháp báo cáo.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!ALLOWED.has(viewer.role)) return fail("FORBIDDEN", "Chỉ luật sư/reviewer được tạo báo cáo.");
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không được phân công xử lý hồ sơ này.");
  }
  try {
    const version = generateDraftReport(params.id, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok({ versionId: version.id, version: version.version, kind: version.kind });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể tạo báo cáo.");
  }
}
