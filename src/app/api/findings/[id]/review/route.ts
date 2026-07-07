import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { findingReviewSchema } from "@/shared/schemas";
import { reviewFinding } from "@/server/services/findings";
import { getViewer } from "@/lib/session";
import { checkCaseAccess } from "@/lib/case-access";
import { getDb } from "@/server/db";
import { ROLE_META } from "@/shared/roles";
import { ok, fail, failFromZod } from "@/lib/http";

const ALLOWED = new Set(["lawyer", "reviewer", "admin"]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!ALLOWED.has(viewer.role)) return fail("FORBIDDEN", "Chỉ luật sư/reviewer được duyệt finding.");

  // Object-level: finding thuộc hồ sơ nào → kiểm tra quyền trên hồ sơ đó (chống sửa finding hồ sơ của LS khác).
  const finding = getDb().findings.find((f) => f.id === params.id);
  if (!finding) return fail("NOT_FOUND", "Không tìm thấy finding.");
  const access = checkCaseAccess(viewer, finding.caseId);
  if (!access.ok) {
    return access.code === "NOT_FOUND"
      ? fail("NOT_FOUND", "Không tìm thấy hồ sơ.")
      : fail("FORBIDDEN", "Bạn không được phân công xử lý hồ sơ này.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = findingReviewSchema.parse(body);
    const finding = reviewFinding(params.id, input, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok({ id: finding.id, status: finding.status });
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof Error && err.message === "NOT_FOUND") return fail("NOT_FOUND", "Không tìm thấy finding.");
    return fail("INTERNAL_ERROR", "Không thể cập nhật finding.");
  }
}
