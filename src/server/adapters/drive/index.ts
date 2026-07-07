// Chọn Drive adapter theo env. DRIVE_PROVIDER=google + đủ credential ⇒ Google thật; ngược lại mock.
import { env, isGoogleDriveConfigured } from "@/lib/env";
import { MockDriveAdapter } from "./mock";
import type { DriveAdapter } from "./types";

export interface DriveStatus {
  mode: "mock" | "google";
  configured: boolean;
  reason: string;
}

/** Trạng thái cấu hình Drive cho trang chẩn đoán admin. */
export function getDriveStatus(): DriveStatus {
  if (env.driveProvider === "google") {
    if (isGoogleDriveConfigured()) {
      return { mode: "google", configured: true, reason: "Đã cấu hình service account + root folder." };
    }
    return {
      mode: "mock",
      configured: false,
      reason: "DRIVE_PROVIDER=google nhưng thiếu GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_DRIVE_ROOT_FOLDER_ID - chưa thể kết nối Google Drive thật.",
    };
  }
  return { mode: "mock", configured: false, reason: "DRIVE_PROVIDER=mock chỉ dành cho local/test." };
}

export async function getDriveAdapter(): Promise<DriveAdapter> {
  if (env.driveProvider === "google" && isGoogleDriveConfigured()) {
    // Lazy import: chỉ nạp googleapis khi thực sự dùng Google (giữ mock path nhẹ).
    const { GoogleDriveAdapter } = await import("./google");
    return new GoogleDriveAdapter({
      clientEmail: env.google.clientEmail,
      privateKey: env.google.privateKey,
      rootFolderId: env.google.rootFolderId,
      sharedDriveId: env.google.sharedDriveId || undefined,
    });
  }
  // Fallback an toàn: không có credential ⇒ mock, app không chết.
  return new MockDriveAdapter();
}

export * from "./types";
