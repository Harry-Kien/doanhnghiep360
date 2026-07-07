import { NextRequest } from "next/server";
import { addDocument, DocumentValidationError, MAX_SIZE_BYTES } from "@/server/services/documents";
import { acceptContractByCustomer, CommercialGuardError } from "@/server/services/commercial";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

// POST /api/cases/:id/contract/sign-upload — khách tải lên HỢP ĐỒNG ĐÃ KÝ SỐ (PDF) → lưu nhóm 00 + đánh dấu đã ký.
// multipart: field "file" + "contractId".
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (viewer.role !== "customer") return fail("FORBIDDEN", "Chỉ khách hàng tải lên hợp đồng đã ký.");
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND" ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.") : fail("FORBIDDEN", "Không có quyền với hồ sơ này.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("VALIDATION_ERROR", "Yêu cầu phải là multipart/form-data.");
  }
  const file = form.get("file");
  const contractId = String(form.get("contractId") ?? "");
  if (!(file instanceof File)) return fail("VALIDATION_ERROR", "Thiếu tệp hợp đồng đã ký.");
  if (!contractId) return fail("VALIDATION_ERROR", "Thiếu mã hợp đồng.");
  if (file.size <= 0 || file.size > MAX_SIZE_BYTES) return fail("VALIDATION_ERROR", "Tệp không hợp lệ hoặc vượt 25MB.");

  try {
    const content = Buffer.from(await file.arrayBuffer());
    // Lưu vào nhóm 00 (hợp đồng & thanh toán). Đây là luồng có kiểm soát ⇒ không áp giới hạn nhóm 01-08 của khách.
    const doc = await addDocument(
      params.id,
      { categoryKey: "00", originalName: file.name, mimeType: file.type || "application/pdf", sizeBytes: content.length, content },
      { id: viewer.id, label: `Hợp đồng đã ký — ${ROLE_META[viewer.role].label}` },
    );
    // Đánh dấu hợp đồng đã ký + chuyển sang chờ thanh toán.
    acceptContractByCustomer(params.id, contractId, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok({ id: doc.id, storedName: doc.storedName, status: "signed" }, 201);
  } catch (err) {
    if (err instanceof DocumentValidationError) return fail("VALIDATION_ERROR", err.message);
    if (err instanceof CommercialGuardError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không lưu được hợp đồng đã ký.");
  }
}
