import { NextRequest } from "next/server";
import { deleteDocument, DocumentAccessError } from "@/server/services/documents";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

// DELETE /api/cases/:id/documents/:docId — gỡ tài liệu up nhầm (xóa bytes trên Drive + tombstone DB).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập để gỡ tài liệu.");

  // Object-level: chỉ thao tác trên hồ sơ mình được phép truy cập.
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không có quyền thao tác trên hồ sơ này.");
  }

  try {
    const result = await deleteDocument(
      params.id,
      params.docId,
      { id: viewer.id, label: ROLE_META[viewer.role].label, role: viewer.role },
    );
    return ok({ id: result.id, storedName: result.storedName, status: "deleted" });
  } catch (err) {
    if (err instanceof DocumentAccessError) return fail(err.code, err.message);
    return fail("PROVIDER_ERROR", "Không gỡ được tài liệu khỏi kho lưu trữ. Vui lòng thử lại.");
  }
}
