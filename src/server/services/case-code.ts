// Sinh mã hồ sơ DN-YYYYMMDD-00001 (không trùng). Counter reset theo ngày.
import { rawDb, commit } from "@/server/db/store";

function ymd(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Sinh mã hồ sơ mới theo ngày hiện tại. Atomic trong tiến trình Node (single-thread),
 * counter lưu trong store ⇒ không trùng kể cả gọi liên tiếp.
 */
export function generateCaseCode(date = new Date()): string {
  const db = rawDb();
  const key = ymd(date);
  const next = (db.caseCodeCounters[key] ?? 0) + 1;
  db.caseCodeCounters[key] = next;
  commit();
  return `DN-${key}-${String(next).padStart(5, "0")}`;
}

/** Dùng cho test/seed: peek không tăng counter. */
export function previewNextCaseCode(date = new Date()): string {
  const db = rawDb();
  const key = ymd(date);
  const next = (db.caseCodeCounters[key] ?? 0) + 1;
  return `DN-${key}-${String(next).padStart(5, "0")}`;
}
