import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const script = path.join(process.cwd(), "scripts", "check-production-env.mjs");

function writeEnv(contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legal360-env-"));
  const file = path.join(dir, ".env.production");
  fs.writeFileSync(file, contents, "utf8");
  return file;
}

const baseEnv = `
APP_BASE_URL="https://legal360.vn"
AUTH_SECRET="12345678901234567890123456789012"
DRIVE_PROVIDER="google"
GOOGLE_SERVICE_ACCOUNT_EMAIL="svc@example.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID="drive-root"
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="mail@example.com"
SMTP_PASS="app-password"
AI_PROVIDER="gemini"
GEMINI_API_KEY="gemini-key"
ADMIN_PASSWORD="strong-admin-password"
`;

describe("check-production-env Supabase gate", () => {
  it("fails when DATA_STORE=supabase but DATABASE_URL is missing", () => {
    const file = writeEnv(`${baseEnv}\nDATA_STORE="supabase"\n`);

    try {
      execFileSync(process.execPath, [script, file], { encoding: "utf8" });
      throw new Error("Expected env check to fail");
    } catch (error) {
      const output = String((error as { stdout?: Buffer | string }).stdout ?? "");
      expect(output).toContain("DATABASE_URL");
    }
  });

  it("passes when DATA_STORE=supabase and DATABASE_URL is configured", () => {
    const file = writeEnv(
      `${baseEnv}\nDATA_STORE="supabase"\nDATABASE_URL="postgres://postgres.project:pass@aws-0-region.pooler.supabase.com:6543/postgres"\n`,
    );

    const output = execFileSync(process.execPath, [script, file], { encoding: "utf8" });

    expect(output).toContain("DATA_STORE=supabase");
    expect(output).toContain("DATABASE_URL");
  });
});
