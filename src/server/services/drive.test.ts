import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore } from "@/server/db";
import { MockDriveAdapter } from "@/server/adapters/drive/mock";
import { DriveProviderError, getDriveStatus } from "@/server/adapters/drive";
import { DRIVE_SUBFOLDERS } from "@/shared/constants";

describe("Drive mock adapter", () => {
  beforeEach(() => __resetStore());

  it("tạo folder gốc + đủ các subfolder cấu hình", async () => {
    const adapter = new MockDriveAdapter();
    const root = await adapter.createCaseFolder("DN-20260618-00001_HOUSTON123");
    expect(root.driveFolderId).toBeTruthy();
    const subs = [];
    for (const s of DRIVE_SUBFOLDERS) subs.push(await adapter.createSubfolder(root.driveFolderId, s.name));
    expect(subs).toHaveLength(DRIVE_SUBFOLDERS.length);
  });

  it("đủ interface production: rename / metadata / shareLink", async () => {
    const adapter = new MockDriveAdapter();
    const f = await adapter.uploadFile("fld", "GCN.pdf", "application/pdf", 1000);
    const renamed = await adapter.renameFile(f.driveFileId, "DN-001_GCN.pdf");
    expect(renamed.name).toBe("DN-001_GCN.pdf");
    const meta = await adapter.getFileMetadata(f.driveFileId);
    expect(meta.name).toBe("DN-001_GCN.pdf");
    expect(meta.mimeType).toBe("application/pdf");
    const link = await adapter.getShareLink(f.driveFileId);
    expect(link).toContain(f.driveFileId);
  });

  it("mô phỏng lỗi provider (failOnce) ⇒ ném DriveProviderError, không crash", async () => {
    const adapter = new MockDriveAdapter({ failOnce: true });
    await expect(adapter.createCaseFolder("X")).rejects.toBeInstanceOf(DriveProviderError);
    await expect(adapter.createCaseFolder("X")).resolves.toBeTruthy();
  });

  it("getDriveStatus mặc định = mock (chưa có credential)", () => {
    const s = getDriveStatus();
    expect(s.mode).toBe("mock");
    expect(s.configured).toBe(false);
  });
});
