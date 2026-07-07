import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { surveyRequestSchema, leadListQuerySchema } from "@/shared/schemas";
import { createLeadFromSurvey } from "@/server/services/leads";
import { issueOtpForCase } from "@/server/services/verification";
import { listLeads } from "@/server/services/cases";
import { getViewer } from "@/lib/session";
import { canViewAllCases } from "@/shared/roles";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, fail, failFromZod } from "@/lib/http";

// POST /api/leads — tạo lead từ phiếu yêu cầu khảo sát (public).
export async function POST(req: NextRequest) {
  // Chống spam form công khai + lạm dụng phát OTP/email: tối đa 5 lead/phút theo IP.
  if (!rateLimit(`leads:${clientIp(req)}`, 5, 60_000)) {
    return fail("RATE_LIMITED", "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ (cần JSON).");
  }

  try {
    const input = surveyRequestSchema.parse(body);
    const result = createLeadFromSurvey(input);

    // Gửi OTP xác thực email. Lỗi gửi không chặn việc tạo lead.
    let otp = { challengeId: "", otpSent: false as boolean, devCode: undefined as string | undefined };
    try {
      const issued = await issueOtpForCase(result.caseId);
      otp = { challengeId: issued.challengeId, otpSent: issued.otpSent, devCode: issued.devCode };
    } catch {
      otp = { challengeId: "", otpSent: false, devCode: undefined };
    }

    return ok({ ...result, ...otp }, 201);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    return fail("INTERNAL_ERROR", "Không thể tạo lead. Vui lòng thử lại.");
  }
}

// GET /api/leads — danh sách lead (admin/intake).
export async function GET(req: NextRequest) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!canViewAllCases(viewer.role)) {
    return fail("FORBIDDEN", "Bạn không có quyền xem danh sách lead.");
  }
  try {
    const q = leadListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const result = listLeads(viewer, q);
    return ok(result);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    return fail("INTERNAL_ERROR", "Không thể tải danh sách lead.");
  }
}
