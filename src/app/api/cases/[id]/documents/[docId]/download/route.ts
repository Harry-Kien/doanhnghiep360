import { NextRequest } from "next/server";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { getDb } from "@/server/db";
import { getDriveAdapter } from "@/server/adapters/drive";
import { fail } from "@/lib/http";

// GET /api/cases/:id/documents/:docId/download — stream bytes thật của tài liệu (từ Drive/mock).
export async function GET(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");

  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không có quyền truy cập tài liệu của hồ sơ này.");
  }

  const doc = getDb().documents.find((d) => d.id === params.docId && d.caseId === params.id);
  if (!doc) return fail("NOT_FOUND", "Không tìm thấy tài liệu.");
  if (!doc.driveFileId) return fail("NOT_FOUND", "Tài liệu chưa được lưu trữ (chưa có nội dung).");

  try {
    const adapter = await getDriveAdapter();
    const bytes = await adapter.downloadFile(doc.driveFileId);
    if (!bytes) return fail("NOT_FOUND", "Không lấy được nội dung tài liệu.");

    const filename = encodeURIComponent(doc.originalName);
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return fail("PROVIDER_ERROR", "Lỗi khi tải tài liệu từ kho lưu trữ.");
  }
}
