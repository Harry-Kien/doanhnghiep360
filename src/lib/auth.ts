// Auth thật cho MVP local: mật khẩu hash bằng scrypt + session token ký HMAC (không cần dịch vụ ngoài).
// Server-only (dùng node:crypto). Phase sau có thể thay bằng Auth.js/Clerk — giữ nguyên Viewer + getViewer.
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

// Bí mật ký session/OTP. BẮT BUỘC đặt AUTH_SECRET (>=16 ký tự) ở production —
// nếu thiếu, throw ngay khi khởi động để không bao giờ chạy với secret hardcode (forge được token).
function resolveSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET chưa được cấu hình (cần >=16 ký tự ngẫu nhiên) ở môi trường production. " +
        "Hãy đặt biến môi trường AUTH_SECRET trước khi khởi động.",
    );
  }
  return s && s.length > 0 ? s : "legal360-dev-secret-change-me-in-prod"; // chỉ dùng cho local dev
}

const SECRET = resolveSecret();
export const SESSION_COOKIE = "legal360_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

/** Bí mật ứng dụng (dùng chung cho HMAC session + OTP). */
export function appSecret(): string {
  return SECRET;
}

/** Cấu hình cookie session chuẩn — `secure` bật ở production (chỉ gửi qua HTTPS). */
export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

// ───────────────────────── Password ─────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ───────────────────────── Session token ─────────────────────────
function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}
function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  // so sánh chữ ký an toàn
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    if (!data.uid || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
