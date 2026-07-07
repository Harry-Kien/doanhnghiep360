import { NextRequest } from "next/server";
import { runAiAnalysis } from "@/server/services/ai-analysis";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

const ALLOWED = new Set(["staff", "lawyer", "reviewer", "admin", "intake"]);

// POST /api/cases/:id/ai/analyze — chạy AI phân tích (mock) sinh finding nháp.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!ALLOWED.has(viewer.role)) return fail("FORBIDDEN", "Không có quyền chạy AI phân tích.");
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không được phân công xử lý hồ sơ này.");
  }
  try {
    const res = await runAiAnalysis(params.id, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok(res);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    console.error("[ai/analyze] error:", err instanceof Error ? err.stack || err.message : err);
    return fail("PROVIDER_ERROR", "AI phân tích lỗi. Vui lòng thử lại hoặc chuyển kiểm tra thủ công.");
  }
}
