import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { issueOtpForCase, verifyOtp, loginWithVerifiedEmail, OtpError } from "./verification";

const lead = {
  companyName: "Cong ty OTP",
  scope: ["corporate"] as string[],
  preferredMode: "either" as const,
  contactName: "Nguoi OTP",
  email: "otp@test.vn",
  phone: "0900000222",
  consent: true as const,
};

describe("OTP verification (Giai đoạn 1)", () => {
  beforeEach(() => __resetStore());

  it("phát OTP (mock trả devCode) + có challenge", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const r = await issueOtpForCase(caseId);
    expect(r.otpSent).toBe(true);
    expect(r.email).toBe("otp@test.vn");
    expect(r.devCode).toMatch(/^\d{6}$/); // mock ⇒ có devCode
    expect(getDb().otpChallenges.filter((c) => c.caseId === caseId)).toHaveLength(1);
  });

  it("nhập đúng OTP ⇒ lead_verified + audit", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const r = await issueOtpForCase(caseId);
    await verifyOtp(r.challengeId, r.devCode!);
    const db = getDb();
    expect(db.cases.find((c) => c.id === caseId)?.status).toBe("lead_verified");
    expect(db.auditLogs.some((a) => a.action === "otp.verified" && a.entityId === caseId)).toBe(true);
  });

  it("xác thực OTP ⇒ tạo tài khoản khách hàng (passwordless) gắn org + trả userId", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const r = await issueOtpForCase(caseId);
    const res = await verifyOtp(r.challengeId, r.devCode!);
    const db = getDb();
    const theCase = db.cases.find((c) => c.id === caseId)!;
    expect(res.userId).toBeTruthy();
    const user = db.users.find((u) => u.id === res.userId)!;
    expect(user.role).toBe("customer");
    expect(user.email.toLowerCase()).toBe("otp@test.vn");
    expect(user.orgId).toBe(theCase.orgId);
    expect(user.passwordHash ?? null).toBeNull(); // không có mật khẩu ⇒ chỉ đăng nhập qua OTP
  });

  it("xác thực OTP lần 2 (cùng email) ⇒ KHÔNG tạo trùng tài khoản", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const r1 = await issueOtpForCase(caseId);
    const res1 = await verifyOtp(r1.challengeId, r1.devCode!);
    // hồ sơ thứ 2 cùng email liên hệ
    const { caseId: caseId2 } = createLeadFromSurvey({ ...lead, companyName: "Cong ty OTP 2" });
    const r2 = await issueOtpForCase(caseId2);
    const res2 = await verifyOtp(r2.challengeId, r2.devCode!);
    expect(res2.userId).toBe(res1.userId); // tái sử dụng cùng tài khoản khách
    expect(getDb().users.filter((u) => u.role === "customer" && u.email.toLowerCase() === "otp@test.vn")).toHaveLength(1);
  });

  it("loginWithVerifiedEmail (Google): email đã đăng ký ⇒ tạo/đăng nhập tài khoản khách", () => {
    const { caseId } = createLeadFromSurvey(lead);
    expect(caseId).toBeTruthy();
    const userId = loginWithVerifiedEmail("OTP@test.vn"); // không phân biệt hoa thường
    expect(userId).toBeTruthy();
    const user = getDb().users.find((u) => u.id === userId)!;
    expect(user.role).toBe("customer");
    expect(user.email.toLowerCase()).toBe("otp@test.vn");
  });

  it("loginWithVerifiedEmail (Google): email CHƯA đăng ký ⇒ null (chặn người lạ)", () => {
    createLeadFromSurvey(lead);
    expect(loginWithVerifiedEmail("nguoila@gmail.com")).toBeNull();
  });

  it("nhập sai OTP ⇒ OtpError, không verify", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const r = await issueOtpForCase(caseId);
    const wrong = r.devCode === "000000" ? "111111" : "000000";
    await expect(verifyOtp(r.challengeId, wrong)).rejects.toBeInstanceOf(OtpError);
    expect(getDb().cases.find((c) => c.id === caseId)?.status).toBe("lead_new");
  });

  it("challenge không tồn tại ⇒ OtpError", async () => {
    await expect(verifyOtp("khong-co", "123456")).rejects.toBeInstanceOf(OtpError);
  });
});
