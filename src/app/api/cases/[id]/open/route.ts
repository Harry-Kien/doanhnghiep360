import { NextRequest } from "next/server";
import { openCase, CannotOpenCaseError } from "@/server/services/open-case";
import { getViewer } from "@/lib/session";
import { ROLE_META, canAccessSection } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  // Mở hồ sơ gắn với xác nhận thanh toán ⇒ intake/admin HOẶC kế toán đều mở được.
  if (!canAccessSection(viewer.role, "intake") && !canAccessSection(viewer.role, "accounting")) {
    return fail("FORBIDDEN", "Chỉ intake/kế toán/admin được mở hồ sơ.");
  }

  try {
    const result = await openCase(params.id, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok(result);
  } catch (err) {
    if (err instanceof CannotOpenCaseError) return fail("STATE_TRANSITION_INVALID", err.message);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể mở hồ sơ.");
  }
}
