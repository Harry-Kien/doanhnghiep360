import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { transitionSchema } from "@/shared/schemas";
import { transitionCase, StateTransitionError } from "@/server/services/workflow";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import type { CaseStatus } from "@/shared/status";
import { ok, fail, failFromZod } from "@/lib/http";

// Các trạng thái CHỈ được đạt tới qua bước nghiệp vụ chuyên dụng (có ràng buộc riêng),
// không cho nhảy tới bằng route transition chung — chống bỏ qua OTP / thanh toán / duyệt cuối.
const SERVICE_GUARDED_STATUSES: Partial<Record<CaseStatus, string>> = {
  lead_verified: "Phải xác thực OTP của khách (POST /api/verify-otp).",
  case_opened: "Phải mở hồ sơ qua bước thanh toán (POST /api/cases/[id]/open).",
  approved: "Phải duyệt & xuất báo cáo qua bước phê duyệt (POST /api/cases/[id]/report/approve).",
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (viewer.role === "customer") return fail("FORBIDDEN", "Khách hàng không thể chuyển trạng thái hồ sơ.");

  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không được phân công xử lý hồ sơ này.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }

  try {
    const input = transitionSchema.parse(body);
    const guard = SERVICE_GUARDED_STATUSES[input.toStatus];
    if (guard) return fail("FORBIDDEN", `Không thể chuyển trực tiếp sang trạng thái này. ${guard}`);

    const updated = transitionCase(params.id, input.toStatus, { id: viewer.id, label: ROLE_META[viewer.role].label }, input.note);
    return ok({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof StateTransitionError) return fail("STATE_TRANSITION_INVALID", err.message);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể chuyển trạng thái.");
  }
}
