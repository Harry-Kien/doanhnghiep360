// Xác thực khách hàng bằng OTP email. Mock ⇒ trả devCode để demo; SMTP ⇒ gửi thật.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
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

function otpEmail(code: string): { subject: string; text: string; html: string } {
  const spacedCode = code.split("").join(" ");
  return {
    subject: "Legal360 - Ma xac thuc yeu cau khao sat",
    text: [
      "Legal360 - Luat Ngoc Son",
      "",
      `Ma xac thuc cua ban la: ${code}`,
      "Ma co hieu luc trong 10 phut. Vui long khong chuyen tiep ma nay cho nguoi khac.",
      "",
      "Neu ban khong thuc hien yeu cau nay, co the bo qua email.",
      "Website: https://luatngocson.com | Dien thoai: 097 2290 595",
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 0">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
                <tr>
                  <td style="padding:22px 26px;background:#0b1b33;color:#ffffff">
                    <div style="font-size:18px;font-weight:700">Legal360 - Luat Ngoc Son</div>
                    <div style="margin-top:4px;font-size:13px;color:#cbd5e1">Xac thuc phieu yeu cau khao sat phap ly 360</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 26px">
                    <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Ma xac thuc cua ban la:</p>
                    <div style="padding:16px 18px;border:1px solid #dbe4f0;border-radius:10px;background:#f8fafc;text-align:center">
                      <div style="font-size:34px;letter-spacing:8px;font-weight:800;color:#0b1b33">${spacedCode}</div>
                    </div>
                    <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#475569">Ma co hieu luc trong 10 phut. Vui long khong chuyen tiep ma nay cho nguoi khac.</p>
                    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#64748b">Neu ban khong thuc hien yeu cau nay, co the bo qua email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 26px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b">
                    Luat Ngoc Son - luatngocson.com - 097 2290 595
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
  };
}

function receivedEmail(): { subject: string; text: string; html: string } {
  return {
    subject: "Legal360 - Da tiep nhan phieu yeu cau",
    text:
      "Cam on ban. Legal360 da tiep nhan phieu yeu cau khao sat. Bo phan tiep nhan se kiem tra thong tin, thuc hien conflict check va lien he gui bao phi/hop dong trong thoi gian som nhat.",
    html:
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6"><h2 style="margin:0 0 12px;color:#0b1b33">Legal360 da tiep nhan phieu yeu cau</h2><p>Cam on ban. Bo phan tiep nhan se kiem tra thong tin, thuc hien conflict check va lien he gui bao phi/hop dong trong thoi gian som nhat.</p><p style="font-size:13px;color:#64748b">Luat Ngoc Son - luatngocson.com - 097 2290 595</p></div>',
  };
}

function hashCode(code: string): string {
  return createHmac("sha256", appSecret()).update(`otp:${code}`).digest("hex");
}

function stableCustomerId(email: string): string {
  return `usr_customer_${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

interface SignedOtpChallenge {
  id: string;
  caseId: string;
  email: string;
  codeHash: string;
  expiresAt: string;
  createdAt: string;
}

function sign(raw: string): string {
  return createHmac("sha256", appSecret()).update(raw).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function challengeToken(challenge: SignedOtpChallenge): string {
  const payload = Buffer.from(JSON.stringify(challenge), "utf8").toString("base64url");
  return `${challenge.id}.${payload}.${sign(payload)}`;
}

function parseChallengeToken(value: string): SignedOtpChallenge | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [id, payload, signature] = parts;
  if (!id.startsWith("otp_") || !safeEqual(sign(payload), signature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedOtpChallenge;
    return parsed.id === id ? parsed : null;
  } catch {
    return null;
  }
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
    ...otpEmail(code),
  });

  recordAudit({ actorId: null, actorLabel: "Hệ thống", action: "otp.issued", entityType: "case", entityId: caseId, metadata: { email, provider: adapter.mode } });

  // devCode chỉ trả về khi email ở chế độ mock VÀ không phải production (tránh lộ OTP qua HTTP response).
  const exposeDevCode = isEmailMock() && process.env.NODE_ENV !== "production";
  return { challengeId: challengeToken(challenge), email, otpSent: true, ...(exposeDevCode ? { devCode: code } : {}) };
}

export async function reissueOtpByChallenge(challengeId: string): Promise<OtpIssueResult> {
  const db = getDb();
  const token = parseChallengeToken(challengeId);
  const current = db.otpChallenges.find((c) => c.id === (token?.id ?? challengeId));
  if (!current && !token) throw new OtpError("Mã xác thực không tồn tại. Vui lòng gửi lại mã mới.");
  if (current?.verified) throw new OtpError("Email đã được xác thực. Vui lòng tiếp tục quy trình.");
  if (!current && token) {
    const lastIssued = new Date(token.createdAt).getTime();
    if (Date.now() - lastIssued < ISSUE_COOLDOWN_MS) {
      throw new OtpError("Bạn vừa yêu cầu mã. Vui lòng đợi khoảng 1 phút trước khi yêu cầu mã mới.");
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const now = new Date();
    const nextChallenge = {
      id: createId("otp"),
      caseId: token.caseId,
      email: token.email,
      codeHash: hashCode(code),
      expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
      attempts: 0,
      verified: false,
      createdAt: now.toISOString(),
    };
    const adapter = getEmailAdapter();
    await adapter.send({ to: token.email, ...otpEmail(code) });
    const exposeDevCode = isEmailMock() && process.env.NODE_ENV !== "production";
    return { challengeId: challengeToken(nextChallenge), email: token.email, otpSent: true, ...(exposeDevCode ? { devCode: code } : {}) };
  }
  if (!current) throw new OtpError("Mã xác thực không tồn tại. Vui lòng gửi lại mã mới.");
  return issueOtpForCase(current.caseId);
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
      id: stableCustomerId(email),
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
  const token = parseChallengeToken(challengeId);
  const ch = db.otpChallenges.find((c) => c.id === (token?.id ?? challengeId)) ?? (token ? { ...token, attempts: 0, verified: false } : null);
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
    ...receivedEmail(),
  });

  return { caseId: ch.caseId, userId };
}
