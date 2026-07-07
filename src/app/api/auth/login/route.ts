import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { getDb } from "@/server/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { recordAudit } from "@/server/services/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, fail, failFromZod } from "@/lib/http";

const schema = z.object({ email: z.string().min(1, "Nhập email").email("Email không hợp lệ"), password: z.string().min(1, "Nhập mật khẩu") });

export async function POST(req: NextRequest) {
  // Chống brute-force/credential-stuffing: tối đa 10 lần đăng nhập/phút theo IP.
  if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000)) {
    return fail("RATE_LIMITED", "Quá nhiều lần thử đăng nhập. Vui lòng đợi một phút rồi thử lại.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = schema.parse(body);
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase() && u.isActive);
    if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      return fail("UNAUTHORIZED", "Email hoặc mật khẩu không đúng.");
    }
    const res = ok({ id: user.id, fullName: user.fullName, email: user.email, role: user.role });
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions());
    recordAudit({ actorId: user.id, actorLabel: user.fullName, action: "auth.login", entityType: "user", entityId: user.id });
    return res;
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    return fail("INTERNAL_ERROR", "Không thể đăng nhập.");
  }
}
