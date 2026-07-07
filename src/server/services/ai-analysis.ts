// Chạy AI phân tích để sinh legal_findings (bản nháp). Pipeline: tải bytes từ Drive → OCR → AI.
// AI chỉ tạo bản nháp + bắt buộc evidence; luật sư duyệt cuối. KHÔNG kết luận thay luật sư.
// Mock providers vẫn chạy được (sinh finding mẫu); real providers cần OCR_PROVIDER=local + AI_PROVIDER=llm.
import { getDb, commit } from "@/server/db";
import { createId } from "@/lib/utils";
import { getAiAdapter } from "@/server/adapters/ai";
import { getOcrAdapter } from "@/server/adapters/ocr";
import { getDriveAdapter } from "@/server/adapters/drive";
import { recordAudit } from "@/server/services/audit";
import { transitionCase } from "@/server/services/workflow";
import type { AiRun, LegalFinding } from "@/shared/types";

type Actor = { id: string | null; label?: string };

export async function runAiAnalysis(caseId: string, actor: Actor): Promise<{ created: number }> {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");

  // Idempotent: nếu đã có finding thì không tạo lại.
  const existing = db.findings.filter((f) => f.caseId === caseId);
  if (existing.length > 0) {
    if (theCase.status === "ai_classifying") transitionCase(caseId, "ai_analyzing", actor, "AI phân tích (đã có finding).");
    return { created: 0 };
  }

  const sr = db.surveyRequests.find((s) => s.caseId === caseId);
  const scope = Array.isArray(sr?.payload.scope) ? (sr!.payload.scope as string[]) : ["corporate"];
  const org = db.organizations.find((o) => o.id === theCase.orgId);
  const docs = db.documents.filter((d) => d.caseId === caseId && d.status !== "deleted");

  const aiAdapter = getAiAdapter();
  const ocrAdapter = getOcrAdapter();
  const driveAdapter = await getDriveAdapter();
  const startedAt = new Date().toISOString();

  // 1) OCR từng tài liệu (tải bytes thật từ Drive). Chưa ghi DB — chỉ gom lại.
  const pendingOcrRuns: AiRun[] = [];
  const ocrTexts: string[] = [];
  for (const d of docs) {
    let content: Buffer | undefined;
    try {
      if (d.driveFileId) content = (await driveAdapter.downloadFile(d.driveFileId)) ?? undefined;
    } catch {
      content = undefined;
    }
    const ocr = await ocrAdapter.extract({ fileName: d.originalName, mimeType: d.mimeType, content });
    if (ocr.text) ocrTexts.push(`${d.originalName}\n${ocr.text}`);
    pendingOcrRuns.push({
      id: createId("air"),
      caseId,
      type: "ocr",
      provider: ocrAdapter.name,
      status: "done",
      input: { documentId: d.id, fileName: d.originalName, hasContent: Boolean(content) },
      output: { pages: ocr.pages, textLength: ocr.text.length },
      confidence: ocr.confidence,
      error: null,
      startedAt,
      finishedAt: new Date().toISOString(),
      createdAt: startedAt,
    });
  }

  // 2) AI phân tích trên text thật (nếu llm + không có text ⇒ findings rỗng; mock ⇒ vẫn sinh theo scope).
  // Lỗi provider sẽ ném ra ngoài — vì chưa commit nên không để lại trạng thái dở dang.
  const result = await aiAdapter.analyze({ caseId, scope, ocrText: ocrTexts, companyName: org?.name });
  const checker = await aiAdapter.check({ findings: result.findings });

  // 3) Ghi DB một lần.
  for (const run of pendingOcrRuns) db.aiRuns.push(run);
  const analyzeRunId = createId("air");
  db.aiRuns.push({
    id: analyzeRunId,
    caseId,
    type: "analyze",
    provider: aiAdapter.name,
    status: "done",
    input: { scope, documents: docs.length, ocrChars: ocrTexts.join("").length },
    output: { findings: result.findings.length, checkerPass: checker.pass },
    confidence: checker.adjustedConfidence,
    error: null,
    startedAt,
    finishedAt: new Date().toISOString(),
    createdAt: startedAt,
  });

  const now = new Date().toISOString();
  for (const draft of result.findings) {
    const finding: LegalFinding = {
      id: createId("find"),
      caseId,
      code: draft.code,
      groupKey: draft.groupKey,
      title: draft.title,
      description: draft.description,
      riskLevel: draft.riskLevel,
      recommendation: draft.recommendation,
      confidence: draft.confidence,
      // Checker fail (thiếu evidence) ⇒ checker_flagged; còn lại ⇒ ai_draft.
      status: draft.evidence.length === 0 ? "checker_flagged" : "ai_draft",
      needsLawyer: true,
      evidence: draft.evidence.map((e) => ({
        id: createId("ev"),
        findingId: "",
        documentId: null,
        snippet: e.snippet,
        // AI thật (Claude/Gemini): gợi ý căn cứ để luật sư xác minh; mock: để trống cho luật sư bổ sung.
        legalBasis: aiAdapter.mode !== "mock" ? e.legalBasisToVerify || null : null,
      })),
      createdAt: now,
      updatedAt: now,
    };
    finding.evidence.forEach((ev) => (ev.findingId = finding.id));
    db.findings.push(finding);

    const scoreByLevel = { low: 25, medium: 50, high: 75, critical: 90 } as const;
    db.riskScores.push({
      id: createId("rs"),
      caseId,
      groupKey: finding.groupKey,
      score: scoreByLevel[finding.riskLevel],
      level: finding.riskLevel,
      createdAt: now,
    });
  }

  for (const [key, value] of Object.entries({ companyName: org?.name ?? "", taxCode: org?.taxCode ?? "" })) {
    db.extractedFields.push({ id: createId("ef"), caseId, documentId: null, aiRunId: analyzeRunId, key, value, confidence: 0.8, createdAt: now });
  }
  commit();

  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label ?? "Hệ thống AI",
    action: "ai.analyzed",
    entityType: "case",
    entityId: caseId,
    metadata: { findings: result.findings.length, checkerPass: checker.pass, aiProvider: aiAdapter.name, ocrProvider: ocrAdapter.name },
  });

  if (theCase.status === "ai_classifying") {
    transitionCase(caseId, "ai_analyzing", actor, `AI tạo ${result.findings.length} phát hiện rủi ro (bản nháp).`);
  }
  return { created: result.findings.length };
}
