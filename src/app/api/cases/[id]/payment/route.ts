import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { paymentSchema } from "@/shared/schemas";
import { recordPayment } from "@/server/services/commercial";
import { getViewer } from "@/lib/session";
import { ROLE_META, canAccessSection } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  // Intake hoặc kế toán được ghi nhận thanh toán.
  if (!canAccessSection(viewer.role, "intake") && !canAccessSection(viewer.role, "accounting")) {
    return fail("FORBIDDEN", "Chỉ intake/kế toán/admin được ghi nhận thanh toán.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = paymentSchema.parse(body);
    const p = recordPayment(params.id, input, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok({ id: p.id, milestone: p.milestone, status: p.status }, 201);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể ghi nhận thanh toán.");
  }
}
