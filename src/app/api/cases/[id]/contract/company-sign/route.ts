import { NextRequest } from "next/server";
import { companyUploadSignedContract } from "@/server/services/commercial";
import { DocumentValidationError, MAX_SIZE_BYTES } from "@/server/services/documents";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META, canAccessSection } from "@/shared/roles";
import { ok, fail } from "@/lib/http";

// POST /api/cases/:id/contract/company-sign — CÔNG TY tải hợp đồng đã ký số + gửi khách (intake/admin).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!canAccessSection(viewer.role, "intake")) return fail("FORBIDDEN", "Chỉ intake/admin gửi hợp đồng đã ký.");
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
  if (!(file instanceof File)) return fail("VALIDATION_ERROR", "Thiếu tệp hợp đồng đã ký.");
  if (file.size <= 0 || file.size > MAX_SIZE_BYTES) return fail("VALIDATION_ERROR", "Tệp không hợp lệ hoặc vượt 25MB.");

  try {
    const content = Buffer.from(await file.arrayBuffer());
    const res = await companyUploadSignedContract(
      params.id,
      { name: file.name, mime: file.type || "application/pdf", content },
      { id: viewer.id, label: ROLE_META[viewer.role].label },
    );
    return ok({ id: res.id, storedName: res.storedName, sent: true }, 201);
  } catch (err) {
    if (err instanceof DocumentValidationError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không gửi được hợp đồng đã ký.");
  }
}
