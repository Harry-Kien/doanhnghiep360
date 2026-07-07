// Xác thực khách hàng bằng OTP email. Mock ⇒ trả devCode để demo; SMTP ⇒ gửi thật.
import { createHmac, randomInt } from "node:crypto";
import { getDb, commit } from "@/server/db";
import { createId } from "@/lib/utils";
import { appSecret } from "@/lib/auth";
import { recordAudit } from "@/server/services/audit";
import { transitionCase } from "@/server/services/workflow";
import { getEmailAdapter, isEmailMock } from "@/server/adapters/email";
import type { User } from "@/shared/types";

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
/** Khoảng cách tối thiểu giữa 2 lần phát OTP cho cùng 1 hồ sơ (chống spam/brute-force bằng re-issue). */
const ISSUE_COOLDOWN_MS = 60 * 1000;
/** Số challenge tối đa còn hiệu lực cho 1 hồ sơ (chống tạo vô hạn challenge để né giới hạn 5 lần thử). */
const MAX_LIVE_CHALLENGES = 5;

function hashCode(code: string): string {
  return createHmac("sha256", appSecret()).update(`otp:${code}`).digest("hex");
}

export class OtpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpError";
  }
}

export interface OtpIssueResult {
  challengeId: string;
  email: string;
  otpSent: boolean;
  /** Chỉ có khi email ở chế độ mock — để demo nhập OTP. */
  devCode?: string;
}

export async function issueOtpForCase(caseId: string): Promise<OtpIssueResult> {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");
  const contact = db.contacts.find((c) => c.id === theCase.primaryContactId);
  const email = contact?.email;
  if (!email) throw new OtpError("Hồ sơ chưa có email liên hệ để gửi OTP.");

  // Chống lạm dụng: cooldown 60s + giới hạn số challenge còn hiệu lực cho mỗi hồ sơ.
  const now0 = Date.now();
  const liveChallenges = db.otpChallenges.filter(
    (c) => c.caseId === caseId && !c.verified && new Date(c.expiresAt).getTime() > now0,
  );
  const lastIssued = liveChallenges.reduce((max, c) => Math.max(max, new Date(c.createdAt).getTime()), 0);
  if (lastIssued && now0 - lastIssued < ISSUE_COOLDOWN_MS) {
    throw new OtpError("Bạn vừa yêu cầu mã. Vui lòng đợi khoảng 1 phút trước khi yêu cầu mã mới.");
  }
  if (liveChallenges.length >= MAX_LIVE_CHALLENGES) {
    throw new OtpError("Đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau khi các mã trước hết hạn.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  const challenge = {
    id: createId("otp"),
    caseId,
    email,
    codeHash: hashCode(code),
    expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
    attempts: 0,
    verified: false,
    createdAt: now.toISOString(),
  };
  db.otpChallenges.push(challenge);
  commit();

  const adapter = getEmailAdapter();
  await adapter.send({
    to: email,
    subject: "Mã xác thực — Khảo sát Pháp lý 360° (Luật Ngọc Sơn)",
    text: `Mã xác thực của bạn là: ${code} (hết hạn sau 10 phút).`,
    html: `<p>Mã xác thực phiếu yêu cầu khảo sát của bạn là:</p><h2 style="letter-spacing:4px">${code}</h2><p>Mã hết hạn sau 10 phút.</p>`,
  });

  recordAudit({ actorId: null, actorLabel: "Hệ thống", action: "otp.issued", entityType: "case", entityId: caseId, metadata: { email, provider: adapter.mode } });

  // devCode chỉ trả về khi email ở chế độ mock VÀ không phải production (tránh lộ OTP qua HTTP response).
  const exposeDevCode = isEmailMock() && process.env.NODE_ENV !== "production";
  return { challengeId: challenge.id, email, otpSent: true, ...(exposeDevCode ? { devCode: code } : {}) };
}

/**
 * Tạo (hoặc tìm) tài khoản KHÁCH HÀNG gắn với tổ chức của hồ sơ — đăng nhập passwordless qua OTP.
 * Quyền truy cập portal được cấp DỰA TRÊN việc khách chứng minh sở hữu email (đã verify OTP).
 * Tài khoản không có mật khẩu (passwordHash=null) ⇒ KHÔNG thể đăng nhập bằng mật khẩu, chỉ qua OTP.
 */
function ensureCustomerAccount(caseId: string): string | null {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase || !theCase.orgId) return null;
  const contact = db.contacts.find((c) => c.id === theCase.primaryContactId);
  if (!contact?.email) return null;

  const email = contact.email.toLowerCase();
  let user = db.users.find((u) => u.role === "customer" && u.email.toLowerCase() === email);
  if (!user) {
    const now = new Date().toISOString();
    user = {
      id: createId("usr"),
      email: contact.email,
      phone: contact.phone ?? null,
      fullName: contact.fullName,
      role: "customer",
      passwordHash: null,
      orgId: theCase.orgId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } satisfies User;
    db.users.push(user);
    commit();
    recordAudit({
      actorId: null,
      actorLabel: "Hệ thống",
      action: "customer.account_created",
      entityType: "user",
      entityId: user.id,
      metadata: { email: contact.email, orgId: theCase.orgId },
    });
  } else if (!user.orgId) {
    user.orgId = theCase.orgId;
    user.updatedAt = new Date().toISOString();
    commit();
  }
  return user.id;
}

/**
 * Phát OTP đăng nhập cho KHÁCH HÀNG QUAY LẠI (passwordless) theo email.
 * Trả null nếu không có tài khoản khách/hồ sơ hợp lệ (route sẽ phản hồi chung để chống dò email).
 */
export async function issueLoginOtpByEmail(
  email: string,
): Promise<{ challengeId: string; otpSent: boolean; devCode?: string } | null> {
  const db = getDb();
  const norm = email.trim().toLowerCase();
  const user = db.users.find((u) => u.role === "customer" && u.isActive && u.email.toLowerCase() === norm);
  if (!user || !user.orgId) return null;
  const latestCase = db.cases
    .filter((c) => c.orgId === user.orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latestCase) return null;
  const issued = await issueOtpForCase(latestCase.id);
  return { challengeId: issued.challengeId, otpSent: issued.otpSent, devCode: issued.devCode };
}

/**
 * Đăng nhập khách hàng theo EMAIL đã được chứng minh sở hữu (vd Google OAuth đã xác thực email).
 * Chỉ chấp nhận email ĐÃ ĐĂNG KÝ khảo sát (có hồ sơ/contact trong hệ thống) — đúng quy trình "tài khoản đã verify".
 * Trả userId nếu hợp lệ; null nếu email chưa từng đăng ký.
 */
export function loginWithVerifiedEmail(email: string): string | null {
  const db = getDb();
  const norm = email.trim().toLowerCase();
  // Đã có tài khoản khách ⇒ đăng nhập luôn.
  const existing = db.users.find((u) => u.role === "customer" && u.isActive && u.email.toLowerCase() === norm);
  if (existing) return existing.id;
  // Chưa có tài khoản nhưng email khớp 1 hồ sơ đã đăng ký ⇒ tạo tài khoản (Google đã xác thực email = đã verify).
  const contactIds = db.contacts.filter((c) => c.email.toLowerCase() === norm).map((c) => c.id);
  if (contactIds.length === 0) return null;
  const latestCase = db.cases
    .filter((c) => c.primaryContactId && contactIds.includes(c.primaryContactId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latestCase) return null;
  return ensureCustomerAccount(latestCase.id);
}

export async function verifyOtp(challengeId: string, code: string): Promise<{ caseId: string; userId: string | null }> {
  const db = getDb();
  const ch = db.otpChallenges.find((c) => c.id === challengeId);
  if (!ch) throw new OtpError("Mã xác thực không tồn tại.");
  if (ch.verified) return { caseId: ch.caseId, userId: ensureCustomerAccount(ch.caseId) };
  if (new Date(ch.expiresAt).getTime() < Date.now()) throw new OtpError("Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.");
  if (ch.attempts >= MAX_ATTEMPTS) throw new OtpError("Nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.");

  if (hashCode(code) !== ch.codeHash) {
    ch.attempts += 1;
    commit();
    throw new OtpError("Mã xác thực không đúng.");
  }

  ch.verified = true;
  commit();
  const userId = ensureCustomerAccount(ch.caseId);

  // Chuyển trạng thái lead_new → lead_verified (nếu hợp lệ).
  try {
    transitionCase(ch.caseId, "lead_verified", { id: null, label: "Khách hàng (OTP)" }, "Khách hàng xác thực email thành công.");
  } catch {
    /* có thể đã verified trước đó */
  }
  recordAudit({ actorId: null, actorLabel: "Khách hàng", action: "otp.verified", entityType: "case", entityId: ch.caseId, metadata: { email: ch.email } });

  // Email xác nhận đã tiếp nhận.
  const adapter = getEmailAdapter();
  await adapter.send({
    to: ch.email,
    subject: "Đã tiếp nhận phiếu yêu cầu khảo sát — Luật Ngọc Sơn",
    text: "Cảm ơn bạn. Bộ phận tiếp nhận sẽ kiểm tra thông tin, thực hiện conflict check và liên hệ gửi báo phí/hợp đồng trong thời gian sớm nhất.",
  });

  return { caseId: ch.caseId, userId };
}
