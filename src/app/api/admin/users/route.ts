import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { listStaffUsers, createStaffUser, UserAdminError } from "@/server/services/users";
import { getViewer } from "@/lib/session";
import { ROLE_META, INTERNAL_ROLES } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

const createSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  fullName: z.string().min(2, "Nhập họ tên"),
  role: z.enum(INTERNAL_ROLES as [string, ...string[]]),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

function requireAdmin() {
  const viewer = getViewer();
  if (!viewer) return { error: fail("UNAUTHORIZED", "Bạn cần đăng nhập.") };
  if (viewer.role !== "admin") return { error: fail("FORBIDDEN", "Chỉ admin được quản lý người dùng.") };
  return { viewer };
}

export async function GET() {
  const { error } = requireAdmin();
  if (error) return error;
  return ok({ items: listStaffUsers() });
}

export async function POST(req: NextRequest) {
  const { viewer, error } = requireAdmin();
  if (error) return error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = createSchema.parse(body);
    const user = createStaffUser(input, { id: viewer!.id, label: ROLE_META[viewer!.role].label });
    return ok(user, 201);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof UserAdminError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không thể tạo tài khoản.");
  }
}
