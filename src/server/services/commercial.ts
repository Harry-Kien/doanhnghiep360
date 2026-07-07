// Phase 2: conflict check, báo phí (proposal), hợp đồng (contract), thanh toán (payment).
// Mỗi hành động ghi record + audit và (khi hợp lệ) chuyển trạng thái theo state machine.
import { getDb, commit } from "@/server/db";
import { createId } from "@/lib/utils";
import { recordAudit } from "@/server/services/audit";
import { transitionCase } from "@/server/services/workflow";
import { PACKAGE_META } from "@/shared/constants";
import type { ConflictCheckInput, ProposalInput, ContractInput, PaymentInput } from "@/shared/schemas";
import type { Contract, Payment, Proposal } from "@/shared/types";

export class CommercialGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommercialGuardError";
  }
}

function ymd(d = new Date()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

type Actor = { id: string | null; label?: string };

// ───────────────────────── Conflict check ─────────────────────────
export function recordConflictCheck(caseId: string, input: ConflictCheckInput, actor: Actor) {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  // Đưa hồ sơ vào trạng thái đang kiểm tra nếu còn ở lead_verified.
  if (theCase.status === "lead_verified") {
    transitionCase(caseId, "conflict_checking", actor, "Bắt đầu kiểm tra xung đột lợi ích.");
  }

  db.conflictChecks.push({
    id: createId("cf"),
    caseId,
    result: input.result,
    checkedById: actor.id,
    matchedAgainst: input.matchedAgainst,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  });
  commit();
  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "conflict.checked",
    entityType: "case",
    entityId: caseId,
    metadata: { result: input.result },
  });

  if (input.result === "clear") {
    transitionCase(caseId, "conflict_cleared", actor, "Không có xung đột lợi ích.");
  } else if (input.result === "rejected") {
    transitionCase(caseId, "cancelled", actor, "Từ chối do xung đột lợi ích.");
  }
  // potential_conflict: giữ ở conflict_checking, chờ partner duyệt.
  return db.cases.find((c) => c.id === caseId)!;
}

export function latestConflictCheck(caseId: string) {
  const db = getDb();
  return [...db.conflictChecks].filter((c) => c.caseId === caseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

// ───────────────────────── Proposal (báo phí) ─────────────────────────
export function createProposal(caseId: string, input: ProposalInput, actor: Actor): Proposal {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  const conflict = latestConflictCheck(caseId);
  if (!conflict || conflict.result !== "clear") {
    throw new CommercialGuardError("Phải hoàn tất conflict check (kết quả: không xung đột) trước khi gửi báo phí.");
  }

  const now = new Date().toISOString();
  const seq = db.proposals.filter((p) => p.caseId === caseId).length + 1;
  const proposal: Proposal = {
    id: createId("prop"),
    caseId,
    code: `BP-${ymd()}-${String(seq).padStart(2, "0")}`,
    package: input.package,
    amount: input.amount,
    vatAmount: input.vatAmount,
    currency: "VND",
    status: "draft",
    validUntil: input.validUntil ?? null,
    createdById: actor.id,
    createdAt: now,
    updatedAt: now,
  };
  theCase.package = input.package;
  db.proposals.push(proposal);
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "proposal.created", entityType: "case", entityId: caseId, metadata: { code: proposal.code, amount: proposal.amount } });
  return proposal;
}

export function sendProposal(caseId: string, proposalId: string, actor: Actor): Proposal {
  const db = getDb();
  const proposal = db.proposals.find((p) => p.id === proposalId && p.caseId === caseId);
  if (!proposal) throw new Error("NOT_FOUND");
  proposal.status = "sent";
  proposal.updatedAt = new Date().toISOString();
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "proposal.sent", entityType: "case", entityId: caseId, metadata: { code: proposal.code } });
  // conflict_cleared -> proposal_sent
  try {
    transitionCase(caseId, "proposal_sent", actor, `Gửi báo phí ${proposal.code} cho khách hàng.`);
  } catch {
    /* có thể đã ở proposal_sent */
  }
  return proposal;
}

export function listProposals(caseId: string): Proposal[] {
  return getDb().proposals.filter((p) => p.caseId === caseId);
}

// ───────────────────────── Contract (hợp đồng) ─────────────────────────
export function createContract(caseId: string, input: ContractInput, actor: Actor): Contract {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");
  const sentProposal = db.proposals.find((p) => p.caseId === caseId && (p.status === "sent" || p.status === "accepted"));
  if (!sentProposal) {
    throw new CommercialGuardError("Cần gửi báo phí trước khi tạo hợp đồng dịch vụ.");
  }

  const now = new Date().toISOString();
  const seq = db.contracts.filter((c) => c.caseId === caseId).length + 1;
  const contract: Contract = {
    id: createId("ctr"),
    caseId,
    proposalId: input.proposalId ?? sentProposal.id,
    code: `HD-${ymd()}-${String(seq).padStart(2, "0")}`,
    templateVersion: input.templateVersion,
    status: "sent",
    signedDocumentId: null,
    signedAt: null,
    createdById: actor.id,
    createdAt: now,
    updatedAt: now,
  };
  db.contracts.push(contract);
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "contract.created", entityType: "case", entityId: caseId, metadata: { code: contract.code, templateVersion: contract.templateVersion } });
  // proposal_sent -> contract_pending (chờ ký)
  try {
    transitionCase(caseId, "contract_pending", actor, `Gửi hợp đồng ${contract.code} (chờ khách ký).`);
  } catch {
    /* noop */
  }
  return contract;
}

export function markContractSigned(caseId: string, contractId: string, actor: Actor): Contract {
  const db = getDb();
  const contract = db.contracts.find((c) => c.id === contractId && c.caseId === caseId);
  if (!contract) throw new Error("NOT_FOUND");
  contract.status = "signed";
  contract.signedAt = new Date().toISOString();
  contract.signedDocumentId = createId("signed");
  contract.updatedAt = contract.signedAt;
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "contract.signed", entityType: "case", entityId: caseId, metadata: { code: contract.code } });
  // contract_pending -> payment_pending
  try {
    transitionCase(caseId, "payment_pending", actor, `Khách đã ký hợp đồng ${contract.code}.`);
  } catch {
    /* noop */
  }
  return contract;
}

export function listContracts(caseId: string): Contract[] {
  return getDb().contracts.filter((c) => c.caseId === caseId);
}

// ───────────────────────── Payment (thanh toán) ─────────────────────────
export function recordPayment(caseId: string, input: PaymentInput, actor: Actor): Payment {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  const now = new Date().toISOString();
  const payment: Payment = {
    id: createId("pay"),
    caseId,
    milestone: input.milestone,
    amount: input.amount,
    method: input.method ?? null,
    status: "paid",
    paidAt: now,
    createdById: actor.id,
    createdAt: now,
    updatedAt: now,
  };
  db.payments.push(payment);
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "payment.recorded", entityType: "case", entityId: caseId, metadata: { milestone: input.milestone, amount: input.amount } });
  return payment;
}

export function listPayments(caseId: string): Payment[] {
  return getDb().payments.filter((p) => p.caseId === caseId);
}

export function hasPaidDeposit(caseId: string): boolean {
  return getDb().payments.some((p) => p.caseId === caseId && p.status === "paid");
}

// ───────────── Hành động self-service của KHÁCH HÀNG trong cổng khách ─────────────

/** Khách đồng ý báo phí: status sent → accepted. */
export function acceptProposalByCustomer(caseId: string, proposalId: string, actor: Actor): Proposal {
  const db = getDb();
  const proposal = db.proposals.find((p) => p.id === proposalId && p.caseId === caseId);
  if (!proposal) throw new Error("NOT_FOUND");
  if (proposal.status === "accepted") return proposal; // idempotent
  if (proposal.status !== "sent") {
    throw new CommercialGuardError("Báo phí này chưa được gửi hoặc đã đóng, không thể đồng ý.");
  }
  proposal.status = "accepted";
  proposal.updatedAt = new Date().toISOString();
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "proposal.accepted_by_customer", entityType: "case", entityId: caseId, metadata: { code: proposal.code } });
  return proposal;
}

/** Khách xác nhận đồng ý hợp đồng (tương đương ký): sent → signed + chuyển payment_pending. */
export function acceptContractByCustomer(caseId: string, contractId: string, actor: Actor): Contract {
  const db = getDb();
  const contract = db.contracts.find((c) => c.id === contractId && c.caseId === caseId);
  if (!contract) throw new Error("NOT_FOUND");
  if (contract.status === "signed") return contract; // idempotent
  if (contract.status !== "sent") {
    throw new CommercialGuardError("Hợp đồng này chưa được gửi hoặc đã đóng, không thể xác nhận.");
  }
  const now = new Date().toISOString();
  contract.status = "signed";
  contract.signedAt = now;
  contract.signedDocumentId = createId("signed");
  contract.updatedAt = now;
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "contract.accepted_by_customer", entityType: "case", entityId: caseId, metadata: { code: contract.code } });
  try {
    transitionCase(caseId, "payment_pending", actor, `Khách hàng xác nhận đồng ý hợp đồng ${contract.code}.`);
  } catch {
    /* noop */
  }
  return contract;
}

/**
 * CÔNG TY (intake/admin) tải lên hợp đồng đã ký số + gửi cho khách:
 * lưu file vào Drive nhóm 00, thông báo cho khách vào cổng xem/ký, ghi audit.
 */
export async function companyUploadSignedContract(
  caseId: string,
  file: { name: string; mime: string; content: Buffer },
  actor: Actor,
): Promise<{ id: string; storedName: string }> {
  const { addDocument } = await import("./documents");
  const doc = await addDocument(
    caseId,
    { categoryKey: "00", originalName: file.name, mimeType: file.mime, sizeBytes: file.content.length, content: file.content },
    { id: actor.id, label: `Hợp đồng công ty ký — ${actor.label ?? "Nội bộ"}` },
  );
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  const customer = theCase ? db.users.find((u) => u.role === "customer" && u.orgId === theCase.orgId) : undefined;
  const now = new Date().toISOString();
  db.notifications.push({
    id: createId("ntf"),
    userId: customer?.id ?? null,
    channel: "inapp",
    title: "Hợp đồng đã ký từ công ty",
    body: "Công ty Luật đã ký hợp đồng và gửi cho bạn. Vui lòng vào cổng khách hàng để xem và ký xác nhận.",
    status: "sent",
    sentAt: now,
    createdAt: now,
  });
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "contract.company_signed_sent", entityType: "case", entityId: caseId, metadata: { storedName: doc.storedName } });
  return { id: doc.id, storedName: doc.storedName };
}

/** Khách báo "đã chuyển khoản" — tạo thông báo + audit để intake xác nhận (KHÔNG tự đánh dấu đã thu). */
export function notifyPaymentByCustomer(caseId: string, actor: Actor): { ok: true } {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");
  const now = new Date().toISOString();
  db.notifications.push({
    id: createId("ntf"),
    userId: null, // hàng đợi nội bộ (intake/kế toán xử lý)
    channel: "inapp",
    title: "Khách hàng báo đã chuyển khoản",
    body: `Hồ sơ ${theCase.caseCode ?? caseId}: khách hàng báo đã thanh toán. Vui lòng kiểm tra và ghi nhận.`,
    status: "sent",
    sentAt: now,
    createdAt: now,
  });
  commit();
  recordAudit({ actorId: actor.id, actorLabel: actor.label, action: "payment.customer_notified", entityType: "case", entityId: caseId, metadata: {} });
  return { ok: true };
}

/** Tính VAT 8% mặc định cho UI gợi ý. */
export function suggestProposalAmount(pkg: ProposalInput["package"]) {
  const base = PACKAGE_META[pkg].price;
  return { amount: base, vatAmount: Math.round(base * 0.08) };
}
