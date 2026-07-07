// Object-level authorization: viewer có được phép thao tác trên 1 hồ sơ cụ thể không?
// Chặn IDOR — ví dụ một luật sư sửa/duyệt hồ sơ được phân công cho luật sư khác.
import { getDb } from "@/server/db";
import { canViewAllCases } from "@/shared/roles";
import type { Viewer } from "@/server/services/cases";
import type { Case } from "@/shared/types";

export type CaseAccess =
  | { ok: true; case: Case }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" };

/**
 * Quy tắc:
 * - admin / intake / reviewer (canViewAllCases) → mọi hồ sơ (vai trò điều phối toàn hệ thống).
 * - accountant → mọi hồ sơ (xử lý thương mại/thanh toán).
 * - lawyer / staff → chỉ hồ sơ được phân công cho mình HOẶC chưa phân công (được phép nhận).
 * - customer → chỉ hồ sơ thuộc tổ chức của mình.
 */
export function checkCaseAccess(viewer: Viewer, caseId: string): CaseAccess {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) return { ok: false, code: "NOT_FOUND" };

  if (viewer.role === "admin" || viewer.role === "accountant" || canViewAllCases(viewer.role)) {
    return { ok: true, case: theCase };
  }
  if (viewer.role === "lawyer" || viewer.role === "staff") {
    const mineOrUnassigned =
      theCase.assignedLawyerId === viewer.id ||
      theCase.reviewerId === viewer.id ||
      theCase.assignedLawyerId == null;
    return mineOrUnassigned ? { ok: true, case: theCase } : { ok: false, code: "FORBIDDEN" };
  }
  if (viewer.role === "customer") {
    return theCase.orgId === viewer.orgId ? { ok: true, case: theCase } : { ok: false, code: "FORBIDDEN" };
  }
  return { ok: false, code: "FORBIDDEN" };
}
