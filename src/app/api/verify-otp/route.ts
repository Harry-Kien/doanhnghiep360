import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { verifyOtp, OtpError } from "@/server/services/verification";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { ok, fail, failFromZod } from "@/lib/http";

// POST /api/verify-otp — xác thực OTP (public, scoped bằng challengeId không đoán được).
const schema = z.object({
  challengeId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Mã xác thực gồm 6 chữ số"),
});

export async function POST(req: NextRequest) {
  // Chống brute-force OTP qua mạng: tối đa 20 lần/phút theo IP (ngoài giới hạn 5 lần/challenge).
  if (!rateLimit(`otp-verify:${clientIp(req)}`, 20, 60_000)) {
    return fail("RATE_LIMITED", "Quá nhiều lần thử mã. Vui lòng đợi một phút rồi thử lại.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = schema.parse(body);
    const res = await verifyOtp(input.challengeId, input.code);
    // Đăng nhập passwordless: xác thực email OTP thành công ⇒ cấp phiên khách hàng (scoped theo org).
    const response = ok({ verified: true, caseId: res.caseId, loggedIn: Boolean(res.userId) });
    if (res.userId) {
      response.cookies.set(SESSION_COOKIE, createSessionToken(res.userId), sessionCookieOptions());
    }
    return response;
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof OtpError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không thể xác thực mã.");
  }
}
