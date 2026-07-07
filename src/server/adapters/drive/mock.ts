// Mock Drive adapter — chạy local không cần API key. Sinh id giả lập, lưu metadata trong bộ nhớ
// và lưu BYTES thật xuống đĩa (.data/drive-mock) để tải lại được như Drive thật (qua restart/nhiều request).
import fs from "node:fs";
import path from "node:path";
import { createId } from "@/lib/utils";
import type { CreatedFile, CreatedFolder, DriveAdapter, DriveFileMetadata } from "./types";
import { DriveProviderError } from "./types";

const MOCK_STORE_DIR = path.join(process.cwd(), ".data", "drive-mock");

function mockFilePath(fileId: string): string {
  // fileId an toàn (createId) — chặn path traversal phòng hờ.
  return path.join(MOCK_STORE_DIR, fileId.replace(/[^a-zA-Z0-9_-]/g, ""));
}

export interface MockDriveOptions {
  /** Mô phỏng lỗi để test resilience. */
  failOnce?: boolean;
}

export class MockDriveAdapter implements DriveAdapter {
  readonly name = "mock";
  readonly mode = "mock" as const;
  private failNext: boolean;
  private files = new Map<string, { name: string; mimeType: string; size: number }>();

  constructor(opts: MockDriveOptions = {}) {
    this.failNext = opts.failOnce ?? false;
  }

  private maybeFail() {
    if (this.failNext) {
      this.failNext = false;
      throw new DriveProviderError("Mock Drive: lỗi mô phỏng (thử lại sau).");
    }
  }

  async createCaseFolder(folderName: string): Promise<CreatedFolder> {
    this.maybeFail();
    const driveFolderId = createId("fld");
    return { driveFolderId, name: folderName, webViewLink: `https://drive.mock/${driveFolderId}` };
  }

  async createSubfolder(_parentFolderId: string, name: string): Promise<CreatedFolder> {
    this.maybeFail();
    const driveFolderId = createId("fld");
    return { driveFolderId, name, webViewLink: `https://drive.mock/${driveFolderId}` };
  }

  async uploadFile(_folderId: string, fileName: string, mimeType: string, size: number, content?: Buffer): Promise<CreatedFile> {
    this.maybeFail();
    const driveFileId = createId("fil");
    this.files.set(driveFileId, { name: fileName, mimeType, size });
    if (content) {
      try {
        fs.mkdirSync(MOCK_STORE_DIR, { recursive: true });
        fs.writeFileSync(mockFilePath(driveFileId), content);
      } catch (err) {
        throw new DriveProviderError("Mock Drive: không ghi được tệp xuống đĩa.", err);
      }
    }
    return { driveFileId, name: fileName, webViewLink: `https://drive.mock/${driveFileId}` };
  }

  async downloadFile(fileId: string): Promise<Buffer | null> {
    try {
      const p = mockFilePath(fileId);
      if (!fs.existsSync(p)) return null;
      return fs.readFileSync(p);
    } catch {
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    this.files.delete(fileId);
    try {
      const p = mockFilePath(fileId);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (err) {
      throw new DriveProviderError("Mock Drive: không xóa được tệp khỏi đĩa.", err);
    }
  }

  async renameFile(fileId: string, newName: string): Promise<CreatedFile> {
    const f = this.files.get(fileId);
    if (f) f.name = newName;
    return { driveFileId: fileId, name: newName, webViewLink: `https://drive.mock/${fileId}` };
  }

  async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
    const f = this.files.get(fileId);
    return {
      driveFileId: fileId,
      name: f?.name ?? "mock-file",
      mimeType: f?.mimeType ?? "application/octet-stream",
      size: f?.size ?? null,
      webViewLink: `https://drive.mock/${fileId}`,
      createdTime: null,
      parents: [],
    };
  }

  async getShareLink(fileOrFolderId: string): Promise<string> {
    return `https://drive.mock/${fileOrFolderId}?share=view`;
  }
}
