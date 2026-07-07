import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { issueLoginOtpByEmail } from "@/server/services/verification";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, fail, failFromZod } from "@/lib/http";

// POST /api/auth/otp-login — khách hàng quay lại yêu cầu mã OTP đăng nhập (passwordless).
const schema = z.object({ email: z.string().min(1, "Nhập email").email("Email không hợp lệ") });

export async function POST(req: NextRequest) {
  // Chống lạm dụng phát OTP/email: tối đa 5 lần/phút theo IP.
  if (!rateLimit(`otp-login:${clientIp(req)}`, 5, 60_000)) {
    return fail("RATE_LIMITED", "Bạn yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = schema.parse(body);
    // Chống dò email: luôn phản hồi "đã gửi nếu hợp lệ"; chỉ kèm challengeId khi có tài khoản thật.
    let challengeId: string | null = null;
    let devCode: string | undefined;
    try {
      const issued = await issueLoginOtpByEmail(input.email);
      if (issued) {
        challengeId = issued.challengeId;
        devCode = issued.devCode;
      }
    } catch {
      // Cooldown/giới hạn/lỗi gửi mail ⇒ vẫn phản hồi chung để không lộ email có tồn tại hay không.
    }
    return ok({ otpSent: true, challengeId, devCode });
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    return fail("INTERNAL_ERROR", "Không thể gửi mã đăng nhập.");
  }
}
