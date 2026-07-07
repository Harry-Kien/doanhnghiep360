// Đọc biến môi trường với default an toàn cho local (mọi provider = mock).
function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

const google = {
  clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || "",
  privateKey: process.env.GOOGLE_PRIVATE_KEY || "",
  rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "",
  sharedDriveId: process.env.GOOGLE_SHARED_DRIVE_ID || "",
  projectId: process.env.GOOGLE_PROJECT_ID || "",
  sheetId: process.env.GOOGLE_SHEET_ID || "",
};

const googleOAuth = {
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
  // Mặc định suy ra từ APP_BASE_URL nếu không khai báo riêng.
  redirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.APP_BASE_URL || "http://localhost:3000"}/api/auth/google/callback`,
};

const smtp = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.SMTP_FROM || "",
};

const anthropic = {
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
};

const gemini = {
  apiKey: process.env.GEMINI_API_KEY || "",
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
};

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Legal360",
  driveProvider: pick(process.env.DRIVE_PROVIDER, ["mock", "google"] as const, "mock"),
  ocrProvider: pick(process.env.OCR_PROVIDER, ["mock", "local", "azure", "google"] as const, "mock"),
  aiProvider: pick(process.env.AI_PROVIDER, ["mock", "llm", "gemini"] as const, "mock"),
  emailProvider: pick(process.env.EMAIL_PROVIDER, ["mock", "smtp"] as const, "mock"),
  dataStore: pick(process.env.DATA_STORE, ["memory", "file", "sqlite", "supabase", "postgres", "postgresql"] as const, "sqlite"),
  google,
  googleOAuth,
  smtp,
  anthropic,
  gemini,
} as const;

// Lưu ý: cấu hình AI/OCR hiệu lực (DB override env) + isAiConfigured/aiModelLabel
// nằm ở src/server/services/settings.ts (server-only). env ở đây chỉ là fallback.

/** Đủ credential để chạy Google Drive thật chưa? */
export function isGoogleDriveConfigured(): boolean {
  return Boolean(google.clientEmail && google.privateKey && google.rootFolderId);
}

/** Đủ cấu hình SMTP để gửi email thật chưa? */
export function isEmailConfigured(): boolean {
  return Boolean(smtp.host && smtp.user && smtp.pass);
}

/** Đã cấu hình Google OAuth (đăng nhập bằng Google) chưa? */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(googleOAuth.clientId && googleOAuth.clientSecret);
}
