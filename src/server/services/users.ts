// Quản lý người dùng nội bộ (Admin): tạo / đổi vai trò / khóa-mở / đặt lại mật khẩu.
import { getDb, commit } from "@/server/db";
import { createId } from "@/lib/utils";
import { hashPassword } from "@/lib/auth";
import { recordAudit } from "@/server/services/audit";
import { INTERNAL_ROLES, type Role } from "@/shared/roles";
import type { User } from "@/shared/types";

export class UserAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAdminError";
  }
}

export interface StaffUserView {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

function toView(u: User): StaffUserView {
  return { id: u.id, email: u.email, fullName: u.fullName, role: u.role, isActive: u.isActive, createdAt: u.createdAt };
}

/** Danh sách tài khoản NỘI BỘ (không gồm khách hàng). Không bao giờ trả passwordHash. */
export function listStaffUsers(): StaffUserView[] {
  return getDb()
    .users.filter((u) => u.role !== "customer")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toView);
}

function assertInternalRole(role: string): asserts role is Role {
  if (!(INTERNAL_ROLES as string[]).includes(role)) {
    throw new UserAdminError("Vai trò không hợp lệ (chỉ vai trò nội bộ).");
  }
}

export function createStaffUser(
  input: { email: string; fullName: string; role: string; password: string },
  actor: { id: string | null; label?: string },
): StaffUserView {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserAdminError("Email không hợp lệ.");
  if (input.fullName.trim().length < 2) throw new UserAdminError("Họ tên quá ngắn.");
  if (input.password.length < 8) throw new UserAdminError("Mật khẩu tối thiểu 8 ký tự.");
  assertInternalRole(input.role);
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    throw new UserAdminError("Email đã tồn tại trong hệ thống.");
  }

  const now = new Date().toISOString();
  const user: User = {
    id: createId("usr"),
    email: input.email.trim(),
    phone: null,
    fullName: input.fullName.trim(),
    role: input.role,
    passwordHash: hashPassword(input.password),
    orgId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  db.users.push(user);
  commit();
  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "user.created",
    entityType: "user",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });
  return toView(user);
}

/** Đổi vai trò / khóa-mở / đặt lại mật khẩu. Chặn tự khóa/hạ chính mình & khóa admin cuối cùng. */
export function updateStaffUser(
  id: string,
  patch: { role?: string; isActive?: boolean; password?: string },
  actor: { id: string | null; label?: string },
): StaffUserView {
  const db = getDb();
  const user = db.users.find((u) => u.id === id && u.role !== "customer");
  if (!user) throw new UserAdminError("Không tìm thấy tài khoản nội bộ.");

  const activeAdmins = db.users.filter((u) => u.role === "admin" && u.isActive);
  const isLastAdmin = user.role === "admin" && activeAdmins.length <= 1;

  if (patch.role !== undefined && patch.role !== user.role) {
    assertInternalRole(patch.role);
    if (isLastAdmin && patch.role !== "admin") throw new UserAdminError("Không thể hạ vai trò admin cuối cùng.");
    user.role = patch.role;
  }
  if (patch.isActive !== undefined && patch.isActive !== user.isActive) {
    if (!patch.isActive && user.id === actor.id) throw new UserAdminError("Không thể tự khóa tài khoản của chính mình.");
    if (!patch.isActive && isLastAdmin) throw new UserAdminError("Không thể khóa admin cuối cùng.");
    user.isActive = patch.isActive;
  }
  if (patch.password !== undefined) {
    if (patch.password.length < 8) throw new UserAdminError("Mật khẩu tối thiểu 8 ký tự.");
    user.passwordHash = hashPassword(patch.password);
  }
  user.updatedAt = new Date().toISOString();
  commit();
  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "user.updated",
    entityType: "user",
    entityId: user.id,
    metadata: {
      role: patch.role,
      isActive: patch.isActive,
      passwordReset: patch.password !== undefined ? true : undefined,
    },
  });
  return toView(user);
}
