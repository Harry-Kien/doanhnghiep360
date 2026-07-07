// Xóa 1 file trên Google Drive theo id. Dùng: node scripts/delete-drive-file.mjs <fileId>
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const fileId = process.argv[2];
if (!fileId) { console.error("Thiếu fileId."); process.exit(1); }

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2];
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });
try {
  await drive.files.delete({ fileId, supportsAllDrives: true });
  console.log("✓ Đã xóa file:", fileId);
} catch (e) {
  console.error("Lỗi xóa:", e?.errors?.[0]?.message || e?.message || e);
  process.exit(1);
}
