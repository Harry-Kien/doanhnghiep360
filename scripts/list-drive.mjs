// Liệt kê nội dung 1 folder Google Drive (mặc định: root đã cấu hình). Dùng: node scripts/list-drive.mjs [folderId] [--tree]
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2];
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

const FOLDER = "application/vnd.google-apps.folder";
const root = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
const tree = process.argv.includes("--tree");

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

async function list(parent) {
  const res = await drive.files.list({
    q: `'${parent}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, size, modifiedTime)",
    orderBy: "folder,name",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: "allDrives",
    pageSize: 200,
  });
  return res.data.files || [];
}

console.log("ROOT folder:", root);
console.log("Link:        https://drive.google.com/drive/folders/" + root);
console.log("");
const items = await list(root);
if (items.length === 0) console.log("  (trống — chưa có hồ sơ nào trên Drive thật)");
for (const f of items) {
  const isF = f.mimeType === FOLDER;
  console.log(`  ${isF ? "📁" : "📄"} ${f.name}${isF ? "/" : ` (${f.size || "?"} bytes)`}   [${f.id}]`);
  if (tree && isF) {
    for (const c of await list(f.id)) {
      console.log(`       ${c.mimeType === FOLDER ? "📁" : "📄"} ${c.name}`);
    }
  }
}
