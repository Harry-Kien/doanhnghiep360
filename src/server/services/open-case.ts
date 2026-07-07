// Mở hồ sơ chính thức: sinh mã hồ sơ + tạo Drive + chuyển sang case_opened.
// Guard: chỉ mở được từ payment_pending (không cho mở khi chưa thanh toán).
import { getDb, commit } from "@/server/db";
import { generateCaseCode } from "@/server/services/case-code";
import { provisionCaseDrive, type ProvisionDriveResult } from "@/server/services/drive";
import { transitionCase } from "@/server/services/workflow";
import { recordAudit } from "@/server/services/audit";
import { hasPaidDeposit } from "@/server/services/commercial";

export class CannotOpenCaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CannotOpenCaseError";
  }
}

export interface OpenCaseResult {
  caseCode: string;
  drive: ProvisionDriveResult;
}

export async function openCase(caseId: string, actor: { id: string | null; label?: string }): Promise<OpenCaseResult> {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");
  if (theCase.status !== "payment_pending") {
    throw new CannotOpenCaseError("Chỉ mở hồ sơ chính thức sau khi đã ký hợp đồng và đến bước thanh toán (payment_pending).");
  }
  if (!hasPaidDeposit(caseId)) {
    throw new CannotOpenCaseError("Chưa ghi nhận thanh toán/tạm ứng. Vui lòng ghi nhận thanh toán trước khi mở hồ sơ.");
  }

  if (!theCase.caseCode) {
    theCase.caseCode = generateCaseCode(new Date());
  }
  theCase.openedAt = new Date().toISOString();
  theCase.updatedAt = theCase.openedAt;
  commit();

  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "case.opened",
    entityType: "case",
    entityId: caseId,
    metadata: { caseCode: theCase.caseCode },
  });

  // Tạo Drive (mock/real). Lỗi Drive KHÔNG chặn mở hồ sơ.
  const drive = await provisionCaseDrive(caseId, actor);

  // Chuyển trạng thái payment_pending -> case_opened.
  transitionCase(caseId, "case_opened", actor, "Mở hồ sơ chính thức, sinh mã và tạo kho tài liệu.");

  return { caseCode: theCase.caseCode, drive };
}
