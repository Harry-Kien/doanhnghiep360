import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { OtpError, reissueOtpByChallenge } from "@/server/services/verification";

const resendOtpSchema = z.object({
  challengeId: z.string().min(16),
});

// POST /api/otp/resend - phat lai OTP cho challenge hien tai.
export async function POST(req: NextRequest) {
  if (!rateLimit(`otp-resend:${clientIp(req)}`, 5, 60_000)) {
    return fail("RATE_LIMITED", "Bạn yêu cầu gửi lại mã quá nhiều lần. Vui lòng thử lại sau ít phút.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }

  const parsed = resendOtpSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Thiếu mã phiên xác thực.");

  try {
    const issued = await reissueOtpByChallenge(parsed.data.challengeId);
    return ok({ challengeId: issued.challengeId, otpSent: issued.otpSent, devCode: issued.devCode });
  } catch (err) {
    if (err instanceof OtpError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không thể gửi lại mã xác thực. Vui lòng thử lại.");
  }
}
