import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { updateStaffUser, UserAdminError } from "@/server/services/users";
import { getViewer } from "@/lib/session";
import { ROLE_META, INTERNAL_ROLES } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

const patchSchema = z.object({
  role: z.enum(INTERNAL_ROLES as [string, ...string[]]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").optional(),
});

// PATCH /api/admin/users/:id — đổi vai trò / khóa-mở / đặt lại mật khẩu (admin-only).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (viewer.role !== "admin") return fail("FORBIDDEN", "Chỉ admin được quản lý người dùng.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = patchSchema.parse(body);
    const user = updateStaffUser(params.id, input, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok(user);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof UserAdminError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không thể cập nhật tài khoản.");
  }
}
