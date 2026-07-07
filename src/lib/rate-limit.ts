// Rate limiter in-memory đơn giản (sliding window) cho các endpoint nhạy cảm.
// Đủ cho 1 instance (dev/demo/server đơn). Production nhiều instance: thay bằng Redis.
import type { NextRequest } from "next/server";

const buckets = new Map<string, number[]>();

/** true nếu được phép; false nếu vượt giới hạn. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/** Lấy IP client (sau proxy) để làm khóa rate limit. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}
