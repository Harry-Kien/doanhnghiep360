import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { contractSchema } from "@/shared/schemas";
import { createContract, markContractSigned, CommercialGuardError } from "@/server/services/commercial";
import { getViewer } from "@/lib/session";
import { ROLE_META, canAccessSection } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

// POST /api/cases/:id/contract  body: contractInput  hoặc { action: "sign", contractId }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!canAccessSection(viewer.role, "intake")) return fail("FORBIDDEN", "Chỉ intake/admin được xử lý hợp đồng.");
  const actor = { id: viewer.id, label: ROLE_META[viewer.role].label };

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }

  try {
    if (body.action === "sign" && typeof body.contractId === "string") {
      const c = markContractSigned(params.id, body.contractId, actor);
      return ok({ id: c.id, status: c.status });
    }
    const input = contractSchema.parse(body);
    const c = createContract(params.id, input, actor);
    return ok({ id: c.id, code: c.code, status: c.status }, 201);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof CommercialGuardError) return fail("STATE_TRANSITION_INVALID", err.message);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể xử lý hợp đồng.");
  }
}
