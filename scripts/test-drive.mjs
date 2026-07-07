// Test kết nối Google Drive THẬT: tạo folder hồ sơ + vài subfolder + upload 1 file nhỏ.
// Đọc .env.local trực tiếp (không qua Next). KHÔNG in private key.
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { google } from "googleapis";

// --- load .env.local ---
const env = {};
const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2];
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

const clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
console.log("client_email:", clientEmail);
console.log("root folder :", rootFolderId);

const auth = new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: ["https://www.googleapis.com/auth/drive"] });
const drive = google.drive({ version: "v3", auth });
const FOLDER = "application/vnd.google-apps.folder";

async function mkFolder(name, parent) {
  const res = await drive.files.create({
    requestBody: { name, mimeType: FOLDER, parents: [parent] },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });
  return res.data;
}

try {
  const stamp = new Date().toISOString().slice(0, 10);
  const root = await mkFolder(`DN-TEST-${stamp}_NGOC-SON`, rootFolderId);
  console.log("\n✓ Tạo folder hồ sơ:", root.name, "→", root.webViewLink);

  for (const sub of ["00.Hop_dong_va_thanh_toan", "01.Thong_tin_doanh_nghiep", "10.Ket_qua_bao_cao"]) {
    const f = await mkFolder(sub, root.id);
    console.log("   ✓ subfolder:", f.name);
  }

  // Upload thử 1 file nhỏ (kiểm tra quota Shared Drive)
  const up = await drive.files.create({
    requestBody: { name: "test-upload.txt", parents: [root.id] },
    media: { mimeType: "text/plain", body: Readable.from(Buffer.from("Legal360 test upload OK")) },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });
  console.log("   ✓ upload file:", up.data.name, "→", up.data.webViewLink);

  console.log("\n✅ REAL_CONNECTED — Google Drive hoạt động. Mở link folder trên để kiểm chứng.");
} catch (e) {
  console.error("\n❌ LỖI:", e?.errors?.[0]?.message || e?.message || e);
  console.error("   (Kiểm tra: service account đã là member của Shared Drive chưa? Drive API đã bật chưa?)");
  process.exit(1);
}
