// Interface chuẩn cho Google Drive. Mock và provider thật cùng implement interface này.
export interface CreatedFolder {
  driveFolderId: string;
  name: string;
  webViewLink: string;
}

export interface CreatedFile {
  driveFileId: string;
  name: string;
  webViewLink: string;
}

export interface DriveFileMetadata {
  driveFileId: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink: string;
  createdTime: string | null;
  parents: string[];
}

export interface DriveAdapter {
  readonly name: string;
  /** mock | google */
  readonly mode: "mock" | "google";
  /** Tạo folder gốc cho hồ sơ (dưới root/Shared Drive). */
  createCaseFolder(folderName: string): Promise<CreatedFolder>;
  /** Tạo subfolder bên trong folder cha. */
  createSubfolder(parentFolderId: string, name: string): Promise<CreatedFolder>;
  /** Upload file vào folder. content = bytes thật của tệp (bắt buộc nếu muốn tải lại được). */
  uploadFile(folderId: string, fileName: string, mimeType: string, size: number, content?: Buffer): Promise<CreatedFile>;
  /** Tải bytes thật của file về (để stream cho khách). null nếu không tìm thấy/không có nội dung. */
  downloadFile(fileId: string): Promise<Buffer | null>;
  /** Xóa VĨNH VIỄN file khỏi Drive (bytes thật biến mất) — dùng khi khách/nội bộ gỡ tài liệu up nhầm. */
  deleteFile(fileId: string): Promise<void>;
  /** Đổi tên file theo mã hồ sơ. */
  renameFile(fileId: string, newName: string): Promise<CreatedFile>;
  /** Lấy metadata file. */
  getFileMetadata(fileId: string): Promise<DriveFileMetadata>;
  /** Lấy link chia sẻ (read-only) cho file/folder. */
  getShareLink(fileOrFolderId: string): Promise<string>;
}

export class DriveProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "DriveProviderError";
  }
}
