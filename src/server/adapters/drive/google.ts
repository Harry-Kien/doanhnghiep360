// Google Drive adapter THẬT (service account JWT). Kích hoạt khi DRIVE_PROVIDER=google + đủ credential.
// Hỗ trợ Shared Drive (supportsAllDrives). KHÔNG bao giờ log private key.
import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";
import type { CreatedFile, CreatedFolder, DriveAdapter, DriveFileMetadata } from "./types";
import { DriveProviderError } from "./types";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface GoogleDriveConfig {
  clientEmail: string;
  privateKey: string;
  rootFolderId: string;
  sharedDriveId?: string;
}

export class GoogleDriveAdapter implements DriveAdapter {
  readonly name = "google";
  readonly mode = "google" as const;
  private drive: drive_v3.Drive;
  private readonly rootFolderId: string;

  constructor(cfg: GoogleDriveConfig) {
    const auth = new google.auth.JWT({
      email: cfg.clientEmail,
      key: cfg.privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    // supportsAllDrives:true cho phép thao tác trên Shared Drive khi rootFolderId nằm trong Shared Drive.
    this.drive = google.drive({ version: "v3", auth });
    this.rootFolderId = cfg.rootFolderId;
  }

  private async createFolder(name: string, parentId: string): Promise<CreatedFolder> {
    try {
      const res = await this.drive.files.create({
        requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
        fields: "id, name, webViewLink",
        supportsAllDrives: true,
      });
      return {
        driveFolderId: res.data.id ?? "",
        name: res.data.name ?? name,
        webViewLink: res.data.webViewLink ?? "",
      };
    } catch (err) {
      throw new DriveProviderError(`Google Drive: không tạo được folder "${name}".`, err);
    }
  }

  createCaseFolder(folderName: string): Promise<CreatedFolder> {
    return this.createFolder(folderName, this.rootFolderId);
  }

  createSubfolder(parentFolderId: string, name: string): Promise<CreatedFolder> {
    return this.createFolder(name, parentFolderId);
  }

  async uploadFile(folderId: string, fileName: string, mimeType: string, _size: number, content?: Buffer): Promise<CreatedFile> {
    try {
      const res = await this.drive.files.create({
        requestBody: { name: fileName, parents: [folderId] },
        media: content ? { mimeType, body: Readable.from(content) } : undefined,
        fields: "id, name, webViewLink",
        supportsAllDrives: true,
      });
      return { driveFileId: res.data.id ?? "", name: res.data.name ?? fileName, webViewLink: res.data.webViewLink ?? "" };
    } catch (err) {
      throw new DriveProviderError(`Google Drive: không upload được "${fileName}".`, err);
    }
  }

  async downloadFile(fileId: string): Promise<Buffer | null> {
    try {
      const res = await this.drive.files.get(
        { fileId, alt: "media", supportsAllDrives: true },
        { responseType: "arraybuffer" },
      );
      return Buffer.from(res.data as ArrayBuffer);
    } catch (err) {
      throw new DriveProviderError(`Google Drive: không tải được nội dung file ${fileId}.`, err);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      // Xóa vĩnh viễn (Shared Drive bỏ qua thùng rác) — bytes thật của khách biến mất khỏi Drive.
      await this.drive.files.delete({ fileId, supportsAllDrives: true });
    } catch (err) {
      throw new DriveProviderError(`Google Drive: không xóa được file ${fileId}.`, err);
    }
  }

  async renameFile(fileId: string, newName: string): Promise<CreatedFile> {
    try {
      const res = await this.drive.files.update({
        fileId,
        requestBody: { name: newName },
        fields: "id, name, webViewLink",
        supportsAllDrives: true,
      });
      return { driveFileId: res.data.id ?? fileId, name: res.data.name ?? newName, webViewLink: res.data.webViewLink ?? "" };
    } catch (err) {
      throw new DriveProviderError(`Google Drive: không đổi tên file ${fileId}.`, err);
    }
  }

  async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
    try {
      const res = await this.drive.files.get({
        fileId,
        fields: "id, name, mimeType, size, webViewLink, createdTime, parents",
        supportsAllDrives: true,
      });
      const d = res.data;
      return {
        driveFileId: d.id ?? fileId,
        name: d.name ?? "",
        mimeType: d.mimeType ?? "",
        size: d.size ? Number(d.size) : null,
        webViewLink: d.webViewLink ?? "",
        createdTime: d.createdTime ?? null,
        parents: d.parents ?? [],
      };
    } catch (err) {
      throw new DriveProviderError(`Google Drive: không lấy được metadata ${fileId}.`, err);
    }
  }

  async getShareLink(fileOrFolderId: string): Promise<string> {
    try {
      // Cấp quyền đọc cho "anyone with link" (có thể đổi sang domain nội bộ tùy chính sách).
      await this.drive.permissions.create({
        fileId: fileOrFolderId,
        requestBody: { role: "reader", type: "anyone" },
        supportsAllDrives: true,
      });
      const res = await this.drive.files.get({ fileId: fileOrFolderId, fields: "webViewLink", supportsAllDrives: true });
      return res.data.webViewLink ?? "";
    } catch (err) {
      throw new DriveProviderError(`Google Drive: không tạo được share link ${fileOrFolderId}.`, err);
    }
  }
}
