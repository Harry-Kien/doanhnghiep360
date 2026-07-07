import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  acceptProposalByCustomer,
  acceptContractByCustomer,
  notifyPaymentByCustomer,
  CommercialGuardError,
} from "@/server/services/commercial";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { ROLE_META } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

// POST /api/cases/:id/portal-commercial — hành động self-service của KHÁCH HÀNG.
const schema = z.object({
  type: z.enum(["accept_proposal", "accept_contract", "notify_payment"]),
  id: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  // Chỉ khách hàng được thực hiện các hành động này, và chỉ trên hồ sơ của tổ chức mình.
  if (viewer.role !== "customer") return fail("FORBIDDEN", "Chỉ khách hàng thực hiện được thao tác này.");
  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không có quyền thao tác trên hồ sơ này.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }

  const actor = { id: viewer.id, label: ROLE_META[viewer.role].label };
  try {
    const input = schema.parse(body);
    if (input.type === "accept_proposal") {
      if (!input.id) return fail("VALIDATION_ERROR", "Thiếu mã báo phí.");
      const p = acceptProposalByCustomer(params.id, input.id, actor);
      return ok({ status: p.status });
    }
    if (input.type === "accept_contract") {
      if (!input.id) return fail("VALIDATION_ERROR", "Thiếu mã hợp đồng.");
      const c = acceptContractByCustomer(params.id, input.id, actor);
      return ok({ status: c.status });
    }
    notifyPaymentByCustomer(params.id, actor);
    return ok({ notified: true });
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof CommercialGuardError) return fail("VALIDATION_ERROR", err.message);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy bản ghi.");
    return fail("INTERNAL_ERROR", "Không thực hiện được thao tác.");
  }
}
