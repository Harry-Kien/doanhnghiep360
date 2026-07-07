// Phiên đăng nhập thật (đọc session token ký HMAC từ cookie). Trả null nếu chưa đăng nhập.
import { cookies } from "next/headers";
import { getDb } from "@/server/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import type { Viewer } from "@/server/services/cases";
import type { User } from "@/shared/types";

export function getCurrentUser(): User | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const uid = verifySessionToken(token);
  if (!uid) return null;
  const db = getDb();
  return db.users.find((u) => u.id === uid && u.isActive) ?? null;
}

/** Viewer hiện tại hoặc null nếu chưa đăng nhập. */
export function getViewer(): Viewer | null {
  const user = getCurrentUser();
  if (!user) return null;
  return { id: user.id, role: user.role, orgId: user.orgId ?? null };
}

/** Thông tin hiển thị an toàn (không lộ passwordHash). */
export function getCurrentUserPublic() {
  const u = getCurrentUser();
  if (!u) return null;
  return { id: u.id, fullName: u.fullName, email: u.email, role: u.role };
}
