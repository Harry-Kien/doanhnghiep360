import { NextRequest } from "next/server";
import { addDocument, DocumentValidationError, MAX_SIZE_BYTES } from "@/server/services/documents";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

// Nhận multipart/form-data: field "file" (bytes thật) + "categoryKey". Lưu bytes lên Drive.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập để tải tài liệu.");

  // Object-level: khách hàng chỉ upload hồ sơ org mình; nội bộ chỉ hồ sơ được phân công.
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không có quyền upload cho hồ sơ này.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("VALIDATION_ERROR", "Yêu cầu phải là multipart/form-data.");
  }

  const file = form.get("file");
  const categoryKey = String(form.get("categoryKey") ?? "");
  if (!(file instanceof File)) return fail("VALIDATION_ERROR", "Thiếu tệp tải lên (field 'file').");
  if (!categoryKey) return fail("VALIDATION_ERROR", "Thiếu nhóm tài liệu (categoryKey).");
  if (file.size <= 0 || file.size > MAX_SIZE_BYTES) return fail("VALIDATION_ERROR", "Dung lượng tệp không hợp lệ hoặc vượt 25MB.");

  try {
    const content = Buffer.from(await file.arrayBuffer());
    const doc = await addDocument(
      params.id,
      { categoryKey, originalName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: content.length, content },
      { id: viewer.id, label: ROLE_META[viewer.role].label, role: viewer.role },
    );
    return ok({ id: doc.id, storedName: doc.storedName, status: doc.status, driveFileId: doc.driveFileId }, 201);
  } catch (err) {
    if (err instanceof DocumentValidationError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không thể lưu tài liệu.");
  }
}
