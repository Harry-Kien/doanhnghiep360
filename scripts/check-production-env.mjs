// Kiểm tra biến môi trường đã sẵn sàng cho production chưa.
// Dùng: node scripts/check-production-env.mjs [.env.production]
import fs from "node:fs";

const file = process.argv[2] || ".env.local";
const env = {};
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[m[1]] = v;
  }
} else {
  Object.assign(env, process.env);
}

const errors = [];
const warns = [];
const ok = [];

function need(key, label) {
  if (env[key] && env[key].trim() !== "") ok.push(`${label} (${key})`);
  else errors.push(`Thiếu ${label} → đặt ${key}`);
}
function eq(key, val, label) {
  if (env[key] === val) ok.push(`${label}: ${key}=${val}`);
  else errors.push(`${label}: cần ${key}="${val}" (đang: "${env[key] ?? ""}")`);
}

// Bắt buộc
need("APP_BASE_URL", "Domain ứng dụng");
need("AUTH_SECRET", "Khóa ký session");
const dataStore = (env.DATA_STORE || "sqlite").trim().toLowerCase();
if (dataStore === "supabase" || dataStore === "postgres" || dataStore === "postgresql") {
  ok.push(`Supabase/Postgres store: DATA_STORE=${dataStore}`);
  need("DATABASE_URL", "Supabase Postgres connection string");
  warns.push("DATA_STORE=supabase đã cấu hình env, nhưng runtime hiện vẫn cần refactor async repository trước khi go-live Vercel production.");
} else if (dataStore === "sqlite" || dataStore === "file") {
  warns.push("DATA_STORE đang dùng SQLite/file. Phù hợp VPS, chưa phù hợp Vercel/serverless production.");
} else if (dataStore !== "memory") {
  errors.push(`DATA_STORE không hợp lệ: "${env.DATA_STORE}". Dùng "supabase" cho Vercel/Supabase hoặc "sqlite" cho VPS.`);
}
eq("DRIVE_PROVIDER", "google", "Google Drive thật");
need("GOOGLE_SERVICE_ACCOUNT_EMAIL", "Service account Drive");
need("GOOGLE_PRIVATE_KEY", "Private key Drive");
need("GOOGLE_DRIVE_ROOT_FOLDER_ID", "Folder gốc Drive");
eq("EMAIL_PROVIDER", "smtp", "Email thật");
need("SMTP_HOST", "SMTP host");
need("SMTP_USER", "SMTP user");
need("SMTP_PASS", "SMTP app password");
eq("AI_PROVIDER", "gemini", "AI Gemini");
need("GEMINI_API_KEY", "Gemini API key");

// Cảnh báo bảo mật / cấu hình
if ((env.AUTH_SECRET ?? "").length < 32) warns.push("AUTH_SECRET nên ≥ 32 ký tự (đang ngắn hơn).");
if ((env.APP_BASE_URL ?? "").includes("localhost")) warns.push("APP_BASE_URL vẫn là localhost — đổi sang domain thật khi deploy.");
if (String(env.SEED_DEMO).toLowerCase() === "true") warns.push("SEED_DEMO=true — sẽ seed dữ liệu DEMO ở production; bỏ đi để bắt đầu SẠCH (chỉ 1 admin master).");
if (!env.ADMIN_PASSWORD) warns.push("Chưa đặt ADMIN_PASSWORD — production sẽ tạo admin master với mật khẩu mặc định 'Legal360@Admin' (đổi ngay sau đăng nhập, hoặc đặt ADMIN_EMAIL/ADMIN_PASSWORD).");
if (env.GOOGLE_OAUTH_CLIENT_ID && !env.GOOGLE_OAUTH_REDIRECT_URI?.startsWith("https://"))
  warns.push("GOOGLE_OAUTH_REDIRECT_URI nên là https://<domain>/api/auth/google/callback ở production.");
if (!env.GOOGLE_OAUTH_CLIENT_ID) warns.push("Chưa cấu hình Google OAuth (đăng nhập Google sẽ ẩn).");

console.log(`\n🔎 Kiểm tra môi trường: ${file}\n`);
console.log(`✅ Đã có (${ok.length}):`);
for (const o of ok) console.log("   ✓ " + o);
if (warns.length) {
  console.log(`\n⚠️  Cảnh báo (${warns.length}):`);
  for (const w of warns) console.log("   ! " + w);
}
if (errors.length) {
  console.log(`\n❌ Thiếu/Lỗi (${errors.length}):`);
  for (const e of errors) console.log("   ✗ " + e);
  console.log("\n→ CHƯA sẵn sàng production. Khắc phục các mục ❌ ở trên.\n");
  process.exit(1);
}
console.log("\n✅ SẴN SÀNG: mọi biến bắt buộc đã được đặt." + (warns.length ? " (xem cảnh báo ⚠️ trên)" : "") + "\n");
