import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { conflictCheckSchema } from "@/shared/schemas";
import { recordConflictCheck } from "@/server/services/commercial";
import { StateTransitionError } from "@/server/services/workflow";
import { getViewer } from "@/lib/session";
import { ROLE_META, canAccessSection } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!canAccessSection(viewer.role, "intake")) return fail("FORBIDDEN", "Chỉ intake/admin được nhập conflict check.");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = conflictCheckSchema.parse(body);
    const c = recordConflictCheck(params.id, input, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok({ id: c.id, status: c.status });
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof StateTransitionError) return fail("STATE_TRANSITION_INVALID", err.message);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể lưu kết quả conflict check.");
  }
}
