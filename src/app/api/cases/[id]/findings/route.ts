import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getViewer } from "@/lib/session";
import { getDb } from "@/server/db";
import { checkCaseAccess } from "@/lib/case-access";
import { listFindings, addFinding } from "@/server/services/findings";
import { findingCreateSchema } from "@/shared/schemas";
import { canViewAllCases, ROLE_META } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

const ADD_ALLOWED = new Set(["lawyer", "reviewer", "admin"]);
// Chỉ cho thêm phát hiện ở các giai đoạn luật sư đang làm việc.
const ADD_STATUSES = new Set(["ai_analyzing", "lawyer_reviewing", "report_drafting", "report_revision"]);

// GET /api/cases/:id/findings — danh sách finding (nội bộ + khách hàng của chính org).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");

  const db = getDb();
  const theCase = db.cases.find((c) => c.id === params.id);
  if (!theCase) return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");

  // RBAC: khách hàng chỉ xem finding của hồ sơ thuộc org mình.
  if (viewer.role === "customer" && theCase.orgId !== viewer.orgId) {
    return fail("FORBIDDEN", "Bạn không có quyền xem hồ sơ này.");
  }
  // Luật sư/staff không phải view-all chỉ xem hồ sơ được phân công.
  if (!canViewAllCases(viewer.role) && viewer.role !== "customer") {
    if (theCase.assignedLawyerId && theCase.assignedLawyerId !== viewer.id) {
      return fail("FORBIDDEN", "Hồ sơ không thuộc phân công của bạn.");
    }
  }

  const findings = listFindings(params.id).map((f) => ({
    id: f.id,
    code: f.code,
    groupKey: f.groupKey,
    title: f.title,
    riskLevel: f.riskLevel,
    status: f.status,
    hasEvidence: f.evidence.length > 0,
    needsLawyer: f.needsLawyer,
  }));
  return ok({ items: findings, total: findings.length });
}

// POST /api/cases/:id/findings — luật sư tự soạn 1 phát hiện (kèm căn cứ pháp lý).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!ADD_ALLOWED.has(viewer.role)) return fail("FORBIDDEN", "Chỉ luật sư/reviewer được thêm phát hiện.");

  const access = checkCaseAccess(viewer, params.id);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không được phân công xử lý hồ sơ này.");
  }
  if (!ADD_STATUSES.has(access.case.status)) {
    return fail("STATE_TRANSITION_INVALID", "Chỉ thêm phát hiện khi hồ sơ đang ở giai đoạn phân tích / luật sư review / soạn báo cáo.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = findingCreateSchema.parse(body);
    const f = addFinding(params.id, input, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok({ id: f.id, code: f.code, status: f.status }, 201);
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy hồ sơ.");
    return fail("INTERNAL_ERROR", "Không thể thêm phát hiện.");
  }
}
