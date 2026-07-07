import { NextRequest } from "next/server";
import { buildContractModel, generateContractDocx } from "@/server/services/contract-doc";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { fail } from "@/lib/http";

// GET /api/cases/:id/contract/download?contractId=... — tải hợp đồng DOCX để khách xem/ký.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND" ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.") : fail("FORBIDDEN", "Không có quyền truy cập hồ sơ này.");
  }

  const contractId = req.nextUrl.searchParams.get("contractId") || "";
  const model = buildContractModel(params.id, contractId);
  if (!model) return fail("NOT_FOUND", "Không tìm thấy hợp đồng.");

  try {
    const buf = await generateContractDocx(model);
    const baseName = `HopDong_${model.contract.code}`;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}.docx`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return fail("INTERNAL_ERROR", "Không tạo được file hợp đồng.");
  }
}
