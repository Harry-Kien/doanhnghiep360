// Quản lý tài liệu upload: validate, đổi tên theo mã hồ sơ, lưu Drive (adapter) + metadata.
import { getDb, commit } from "@/server/db";
import { env } from "@/lib/env";
import { createId, slugify } from "@/lib/utils";
import { getDriveAdapter } from "@/server/adapters/drive";
import { recordAudit } from "@/server/services/audit";
import { generateCaseCode } from "@/server/services/case-code";
import { provisionCaseDrive } from "@/server/services/drive";
import { transitionCase } from "@/server/services/workflow";
import { DRIVE_SUBFOLDERS, SURVEY_REQUEST_FORM_CATEGORY, isCustomerUploadableKey } from "@/shared/constants";
import { canTransition } from "@/shared/status";
import type { Role } from "@/shared/roles";
import type { DocumentRecord } from "@/shared/types";

export const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

/** Lỗi phân quyền/không tìm thấy ở mức từng tài liệu (object-level). */
export class DocumentAccessError extends Error {
  constructor(public code: "NOT_FOUND" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "DocumentAccessError";
  }
}

/** Trạng thái hồ sơ mà khách hàng còn được phép tự gỡ tài liệu up nhầm (giai đoạn nộp tài liệu). */
export const CUSTOMER_DELETABLE_STATUSES = [
  "lead_new",
  "info_form_sent",
  "info_form_uploaded",
  "waiting_documents",
  "documents_received",
  "need_more_documents",
  "case_opened",
] as const;

const SURVEY_REQUEST_FORM_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const SURVEY_REQUEST_FORM_LOCKED_STATUSES = [
  "final_report_ready",
  "delivered",
  "roadmap_followup",
  "retainer_proposal_sent",
  "retainer_proposed",
  "completed",
  "cancelled",
] as const;

export interface AddDocumentInput {
  categoryKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /** Bytes thật của tệp. Khi có ⇒ lưu lên Drive (tải lại được) + dùng làm nguồn size/mime đáng tin. */
  content?: Buffer;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Đối chiếu nội dung với MIME khai báo qua magic bytes (chống giả mạo định dạng).
 * PDF/PNG/JPEG: BẮT BUỘC khớp chữ ký. DOC/DOCX (OLE/zip) khó phân biệt chắc chắn ⇒ chấp nhận.
 */
function contentMatchesDeclaredMime(content: Buffer, mime: string): boolean {
  if (mime === "application/pdf") return content.length >= 4 && content.toString("ascii", 0, 4) === "%PDF";
  if (mime === "image/png") return content.length >= 8 && content.toString("hex", 0, 8) === "89504e470d0a1a0a";
  if (mime === "image/jpeg") return content.length >= 3 && content.toString("hex", 0, 3) === "ffd8ff";
  return true;
}

function isSurveyRequestFormCategory(categoryKey: string): boolean {
  return categoryKey === SURVEY_REQUEST_FORM_CATEGORY.key;
}

async function ensureSurveyRequestStorage(
  caseId: string,
  actor: { id: string | null; label?: string; role?: Role },
): Promise<void> {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  if (!theCase.caseCode) {
    theCase.caseCode = generateCaseCode(new Date());
    theCase.updatedAt = new Date().toISOString();
    commit();
    recordAudit({
      actorId: actor.id,
      actorLabel: actor.label,
      action: "case.code_assigned_for_survey_request",
      entityType: "case",
      entityId: caseId,
      metadata: { caseCode: theCase.caseCode },
    });
  }

  const hasSurveyFolder = getDb().driveFolders.some(
    (folder) => folder.caseId === caseId && folder.subfolderKey === SURVEY_REQUEST_FORM_CATEGORY.key && folder.status === "active",
  );
  if (!hasSurveyFolder) {
    await provisionCaseDrive(caseId, actor);
  }
}

export async function addDocument(
  caseId: string,
  input: AddDocumentInput,
  actor: { id: string | null; label?: string; role?: Role },
): Promise<DocumentRecord> {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  if (!(ALLOWED_MIME as readonly string[]).includes(input.mimeType)) {
    throw new DocumentValidationError("Định dạng tệp không được hỗ trợ (chỉ PDF, DOC/DOCX, JPG, PNG).");
  }
  // Khi có bytes thật: size lấy từ nội dung (đáng tin), và đối chiếu magic bytes với MIME khai báo.
  const sizeBytes = input.content ? input.content.length : input.sizeBytes;
  if (sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
    throw new DocumentValidationError("Dung lượng tệp không hợp lệ hoặc vượt quá giới hạn 25MB.");
  }
  if (input.content && !contentMatchesDeclaredMime(input.content, input.mimeType)) {
    throw new DocumentValidationError("Nội dung tệp không khớp với định dạng khai báo.");
  }
  const cat = DRIVE_SUBFOLDERS.find((s) => s.key === input.categoryKey);
  if (!cat) throw new DocumentValidationError("Nhóm tài liệu không hợp lệ.");
  if (isSurveyRequestFormCategory(input.categoryKey)) {
    if (!(SURVEY_REQUEST_FORM_MIME as readonly string[]).includes(input.mimeType)) {
      throw new DocumentValidationError("Phiếu yêu cầu khảo sát chỉ nhận tệp DOCX hoặc PDF.");
    }
    if (actor.role === "customer" && (SURVEY_REQUEST_FORM_LOCKED_STATUSES as readonly string[]).includes(theCase.status)) {
      throw new DocumentValidationError("Hồ sơ đã qua giai đoạn nhận phiếu khảo sát, vui lòng liên hệ Legal360 để cập nhật.");
    }
    await ensureSurveyRequestStorage(caseId, actor);
  }
  // Phân quyền theo nhóm: khách hàng chỉ được upload các nhóm trong checklist khách hàng.
  // Các nhóm nội bộ/hệ thống (00, 09, 10, 99) do nội bộ quản lý — chặn ngay cả khi khách gọi thẳng API.
  if (actor.role === "customer" && !isCustomerUploadableKey(input.categoryKey)) {
    throw new DocumentValidationError(
      "Khách hàng chỉ được tải lên phiếu khảo sát và các nhóm tài liệu doanh nghiệp trong checklist. Nhóm hợp đồng/thanh toán, AI/phân tích, báo cáo và lưu trữ nội bộ do luật sư quản lý.",
    );
  }

  const org = db.organizations.find((o) => o.id === theCase.orgId);
  const ext = EXT_BY_MIME[input.mimeType] ?? "bin";
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const seq = db.documents.filter((d) => d.caseId === caseId).length + 1;
  const storedName = `${theCase.caseCode ?? "DN-PENDING"}_${org?.slug ?? "CONG-TY"}_${input.categoryKey}_${slugify(input.originalName).slice(0, 12) || "TAI-LIEU"}_${dateStr}_${pad(seq)}.${ext}`;

  // Lưu vào Drive (mock/real). Lỗi Drive ⇒ vẫn lưu metadata, status=drive_error.
  let driveFileId: string | null = null;
  let status = "uploaded";
  try {
    const folder = db.driveFolders.find((f) => f.caseId === caseId && f.subfolderKey === input.categoryKey);
    const adapter = await getDriveAdapter();
    // Folder dự phòng khi chưa có mapping (hoặc mapping cũ/không hợp lệ): root thật của Google, hoặc "root" cho mock.
    const fallbackParent = adapter.mode === "google" && env.google.rootFolderId ? env.google.rootFolderId : "root";
    const parent = folder?.driveFolderId ?? fallbackParent;
    try {
      const uploaded = await adapter.uploadFile(parent, storedName, input.mimeType, sizeBytes, input.content);
      driveFileId = uploaded.driveFileId;
    } catch (err) {
      // Parent cũ/không tồn tại trên Google (vd hồ sơ seed có folder mock) ⇒ thử lại vào root thật.
      if (adapter.mode === "google" && parent !== fallbackParent && fallbackParent !== "root") {
        const retry = await adapter.uploadFile(fallbackParent, storedName, input.mimeType, sizeBytes, input.content);
        driveFileId = retry.driveFileId;
      } else {
        throw err;
      }
    }
  } catch {
    status = "drive_error";
  }

  const record: DocumentRecord = {
    id: createId("doc"),
    caseId,
    categoryKey: input.categoryKey,
    originalName: input.originalName,
    storedName,
    mimeType: input.mimeType,
    sizeBytes,
    driveFileId,
    uploaderId: actor.id,
    status,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.documents.push(record);
  db.documentVersions.push({
    id: createId("dv"),
    documentId: record.id,
    version: 1,
    driveFileId,
    uploaderId: actor.id,
    note: "Bản tải lên đầu tiên.",
    createdAt: now.toISOString(),
  });
  commit();

  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "document.uploaded",
    entityType: "document",
    entityId: record.id,
    metadata: { caseId, categoryKey: input.categoryKey, storedName, driveStatus: status },
  });

  if (isSurveyRequestFormCategory(input.categoryKey) && actor.role === "customer") {
    recordAudit({
      actorId: actor.id,
      actorLabel: actor.label,
      action: "customer.uploaded_survey_request_form",
      entityType: "document",
      entityId: record.id,
      metadata: { caseId, categoryKey: input.categoryKey, storedName, driveStatus: status },
    });

    const currentStatus = getDb().cases.find((c) => c.id === caseId)?.status;
    if (currentStatus && canTransition(currentStatus, "info_form_uploaded")) {
      transitionCase(caseId, "info_form_uploaded", actor, "Khách hàng đã tải lên phiếu yêu cầu khảo sát đã điền.");
    }
  }

  return record;
}

/** Tài liệu còn hiệu lực (bỏ qua tombstone đã xóa). */
export function listDocuments(caseId: string): DocumentRecord[] {
  return getDb().documents.filter((d) => d.caseId === caseId && d.status !== "deleted");
}

/** Số tệp đã upload theo từng nhóm (categoryKey) — bỏ qua tài liệu đã xóa. */
export function countByCategory(caseId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of getDb().documents) {
    if (d.caseId === caseId && d.status !== "deleted" && d.categoryKey) {
      out[d.categoryKey] = (out[d.categoryKey] ?? 0) + 1;
    }
  }
  return out;
}

/**
 * Gỡ tài liệu up nhầm: xóa VĨNH VIỄN bytes trên Drive, để lại tombstone (status="deleted") cho audit.
 * Phân quyền object-level (case-access đã kiểm ở route):
 *  - Khách hàng: chỉ gỡ file CỦA MÌNH (uploaderId), thuộc nhóm khách 01–08, khi hồ sơ còn ở giai đoạn nộp tài liệu.
 *  - Nội bộ (staff/lawyer/intake/admin/...): gỡ được tài liệu trong hồ sơ họ có quyền truy cập.
 * Nếu xóa trên Drive thất bại ⇒ KHÔNG đánh dấu đã xóa (không che giấu việc bytes vẫn còn).
 */
export async function deleteDocument(
  caseId: string,
  docId: string,
  actor: { id: string | null; label?: string; role?: Role },
): Promise<{ id: string; storedName: string }> {
  const db = getDb();
  const doc = db.documents.find((d) => d.id === docId && d.caseId === caseId && d.status !== "deleted");
  if (!doc) throw new DocumentAccessError("NOT_FOUND", "Không tìm thấy tài liệu.");

  if (actor.role === "customer") {
    if (doc.uploaderId !== actor.id) {
      throw new DocumentAccessError("FORBIDDEN", "Bạn chỉ có thể gỡ tài liệu do chính mình tải lên.");
    }
    if (!isCustomerUploadableKey(doc.categoryKey)) {
      throw new DocumentAccessError("FORBIDDEN", "Tài liệu này do nội bộ quản lý, bạn không thể gỡ.");
    }
    const theCase = db.cases.find((c) => c.id === caseId);
    if (!theCase || !(CUSTOMER_DELETABLE_STATUSES as readonly string[]).includes(theCase.status)) {
      throw new DocumentAccessError("FORBIDDEN", "Hồ sơ đã qua giai đoạn nộp tài liệu, vui lòng liên hệ luật sư để chỉnh sửa.");
    }
  }

  // Xóa bytes thật trên Drive trước. Lỗi ⇒ ném ra để không tombstone nhầm (bytes có thể còn).
  if (doc.driveFileId) {
    const adapter = await getDriveAdapter();
    await adapter.deleteFile(doc.driveFileId);
  }

  const now = new Date().toISOString();
  const removedDriveId = doc.driveFileId;
  doc.status = "deleted";
  doc.driveFileId = null;
  doc.updatedAt = now;
  for (const v of db.documentVersions) {
    if (v.documentId === doc.id) v.driveFileId = null;
  }
  commit();

  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "document.deleted",
    entityType: "document",
    entityId: doc.id,
    metadata: { caseId, categoryKey: doc.categoryKey, storedName: doc.storedName, removedDriveId },
  });

  return { id: doc.id, storedName: doc.storedName };
}
