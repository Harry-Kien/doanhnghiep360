// Nạp service-account JSON vào .env.local mà KHÔNG in private key.
// Dùng: node scripts/setup-google-env.mjs "<đường dẫn file json>"
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Thiếu đường dẫn file JSON.");
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!sa.client_email || !sa.private_key) {
  console.error("File JSON không hợp lệ (thiếu client_email/private_key).");
  process.exit(1);
}

const envPath = path.join(process.cwd(), ".env.local");
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const map = new Map();
for (const line of existing.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) map.set(m[1], m[2]);
}

// Mặc định an toàn nếu chưa có
const defaults = {
  NEXT_PUBLIC_APP_NAME: '"Legal360 — Ngọc Sơn & Partners"',
  APP_BASE_URL: '"http://localhost:3000"',
  AUTH_SECRET: `"${randomBytes(24).toString("hex")}"`,
  OCR_PROVIDER: '"mock"',
  AI_PROVIDER: '"mock"',
  EMAIL_PROVIDER: '"mock"',
  DATA_STORE: '"sqlite"',
};
for (const [k, v] of Object.entries(defaults)) if (!map.has(k)) map.set(k, v);

// Google Drive thật
const escKey = sa.private_key.replace(/\r?\n/g, "\\n");
map.set("DRIVE_PROVIDER", '"google"');
map.set("GOOGLE_PROJECT_ID", `"${sa.project_id ?? ""}"`);
map.set("GOOGLE_SERVICE_ACCOUNT_EMAIL", `"${sa.client_email}"`);
map.set("GOOGLE_PRIVATE_KEY", `"${escKey}"`);
if (!map.has("GOOGLE_DRIVE_ROOT_FOLDER_ID")) map.set("GOOGLE_DRIVE_ROOT_FOLDER_ID", '""');
if (!map.has("GOOGLE_SHARED_DRIVE_ID")) map.set("GOOGLE_SHARED_DRIVE_ID", '""');

const out = [...map.entries()].map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
fs.writeFileSync(envPath, out, "utf8");

// Chỉ in thông tin AN TOÀN
console.log("✓ Đã ghi .env.local");
console.log("  project_id      :", sa.project_id);
console.log("  client_email    :", sa.client_email);
console.log("  private_key      : (đã nạp,", sa.private_key.length, "ký tự — KHÔNG hiển thị)");
console.log("  ROOT_FOLDER_ID  :", (map.get("GOOGLE_DRIVE_ROOT_FOLDER_ID") || '""'), "(cần điền nếu rỗng)");
console.log("\n→ HÃY SHARE 1 folder Drive cho email service account ở trên (quyền Editor), rồi gửi tôi FOLDER ID.");
