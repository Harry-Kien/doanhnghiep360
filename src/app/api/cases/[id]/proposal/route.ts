import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { proposalSchema } from "@/shared/schemas";
import { createProposal, sendProposal, CommercialGuardError } from "@/server/services/commercial";
import { getViewer } from "@/lib/session";
import { ROLE_META, canAccessSection } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

// POST /api/cases/:id/proposal  body: { ...proposal, send?: boolean }  hoặc { action: "send", proposalId }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!canAccessSection(viewer.role, "intake")) return fail("FORBIDDEN", "Chỉ intake/admin được tạo báo phí.");
  const actor = { id: viewer.id, label: ROLE_META[viewer.role].label };

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }

  try {
    if (body.action === "send" && typeof body.proposalId === "string") {
      const p = sendProposal(params.id, body.proposalId, actor);
      return ok({ id: p.id, status: p.status });
    }
    const input = proposalSchema.parse(body);
    const p = createProposal(params.id, input, actor);
    if (body.send === true) sendProposal(params.id, p.id, actor);
    return ok({ id: p.id, code: p.code, status: body.send === true ? "sent" : p.status }, 201);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof CommercialGuardError) return fail("STATE_TRANSITION_INVALID", err.message);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể tạo báo phí.");
  }
}
