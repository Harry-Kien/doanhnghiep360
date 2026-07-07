// AI legal analysis adapter — interface + mock + Claude (llm) + Gemini (free tier).
// AI chỉ tạo bản nháp (ai_draft), BẮT BUỘC evidence; KHÔNG kết luận cuối — luật sư duyệt.
// Cấu hình lấy từ settings (DB override env) để cài key qua Admin.
import { effectiveAiConfig, isAiConfigured } from "@/server/services/settings";
import type { RiskLevel } from "@/shared/constants";

export interface AiFindingDraft {
  code: string;
  groupKey: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  recommendation: string;
  confidence: number;
  needsLawyer: true;
  evidence: { snippet: string; legalBasisToVerify: string }[];
}

export interface AiAnalysisResult {
  findings: AiFindingDraft[];
}

export interface AiCheckerResult {
  pass: boolean;
  warnings: string[];
  missingDocuments: string[];
  adjustedConfidence: number;
}

export interface AiAnalyzeInput {
  caseId: string;
  scope: string[];
  ocrText: string[];
  companyName?: string;
}

export interface AiAdapter {
  readonly name: string;
  readonly mode: "mock" | "llm" | "gemini";
  analyze(input: AiAnalyzeInput): Promise<AiAnalysisResult>;
  check(input: { findings: AiFindingDraft[] }): Promise<AiCheckerResult>;
}

const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

/** Checker dùng chung: bảo đảm mọi finding final-ready phải có ≥1 evidence. */
function evidenceChecker(findings: AiFindingDraft[]): AiCheckerResult {
  const withoutEvidence = findings.filter((f) => f.evidence.length === 0);
  return {
    pass: withoutEvidence.length === 0,
    warnings: withoutEvidence.map((f) => `Finding ${f.code} thiếu chứng cứ.`),
    missingDocuments: [],
    adjustedConfidence: 0.68,
  };
}

const SYSTEM_PROMPT = `Bạn là trợ lý pháp lý của Luật Ngọc Sơn, hỗ trợ dịch vụ "Khảo sát Pháp lý Doanh nghiệp 360°".
Nhiệm vụ: đọc nội dung tài liệu doanh nghiệp cung cấp và phát hiện RỦI RO PHÁP LÝ dưới dạng BẢN NHÁP để luật sư duyệt.

Nguyên tắc bắt buộc:
- Chỉ tạo phát hiện DỰA TRÊN nội dung tài liệu được cung cấp. KHÔNG bịa.
- MỖI phát hiện PHẢI có ít nhất một "evidence" với "snippet" là trích đoạn NGUYÊN VĂN (hoặc gần nguyên văn) từ tài liệu, và "legalBasisToVerify" là căn cứ pháp luật Việt Nam cần luật sư xác minh (ví dụ: "Luật Doanh nghiệp 2020, Điều 24").
- Nếu không tìm thấy bằng chứng trong tài liệu cho một rủi ro, ĐỪNG tạo phát hiện đó.
- Đây là bản nháp hỗ trợ, KHÔNG phải kết luận pháp lý cuối cùng.
- "groupKey" chọn trong danh sách phạm vi khảo sát được cung cấp.
- "riskLevel": low | medium | high | critical. "confidence": 0..1.
- Viết bằng tiếng Việt, ngắn gọn, chính xác.`;

function buildUserContent(input: AiAnalyzeInput, docs: string[]): string {
  return [
    `Doanh nghiệp: ${input.companyName ?? "(không rõ)"}`,
    `Phạm vi khảo sát (groupKey hợp lệ): ${input.scope.join(", ")}`,
    "",
    "Nội dung tài liệu (đã trích xuất):",
    ...docs.map((t, i) => `--- Tài liệu ${i + 1} ---\n${t.slice(0, 12000)}`),
    "",
    "Hãy trả về danh sách phát hiện rủi ro pháp lý theo schema. Nếu không có rủi ro rõ ràng có bằng chứng, trả về findings rỗng.",
  ].join("\n");
}

type RawFinding = Partial<Omit<AiFindingDraft, "code" | "needsLawyer">> & {
  evidence?: Array<{ snippet?: string; legalBasisToVerify?: string }>;
};

/** Chuẩn hóa output thô của LLM thành AiFindingDraft (clamp + gán code). Dùng chung Claude/Gemini. */
function toFindingDrafts(raw: RawFinding[], scope: string[]): AiFindingDraft[] {
  const scopeSet = new Set(scope);
  return (raw ?? []).map((f, i) => ({
    code: `F-${String(i + 1).padStart(2, "0")}`,
    groupKey: f.groupKey && scopeSet.has(f.groupKey) ? f.groupKey : scope[0] ?? "corporate",
    title: String(f.title ?? "Phát hiện rủi ro").slice(0, 300),
    description: String(f.description ?? ""),
    riskLevel: (RISK_LEVELS as readonly string[]).includes(f.riskLevel as string) ? (f.riskLevel as RiskLevel) : "medium",
    recommendation: String(f.recommendation ?? ""),
    confidence: typeof f.confidence === "number" ? Math.max(0, Math.min(1, f.confidence)) : 0.7,
    needsLawyer: true,
    evidence: Array.isArray(f.evidence)
      ? f.evidence.filter((e) => e && e.snippet).map((e) => ({ snippet: String(e.snippet), legalBasisToVerify: String(e.legalBasisToVerify ?? "") }))
      : [],
  }));
}

class MockAiAdapter implements AiAdapter {
  readonly name = "mock";
  readonly mode = "mock" as const;

  async analyze(input: AiAnalyzeInput): Promise<AiAnalysisResult> {
    const findings: AiFindingDraft[] = input.scope.slice(0, 4).map((group, i) => ({
      code: `F-${String(i + 1).padStart(2, "0")}`,
      groupKey: group,
      title: `Rủi ro tiềm ẩn nhóm ${group} (bản nháp AI)`,
      description: "Phát hiện sơ bộ cần luật sư kiểm tra và bổ sung căn cứ pháp luật.",
      riskLevel: RISK_LEVELS[i % 4],
      recommendation: "Đề xuất rà soát và xử lý theo roadmap.",
      confidence: 0.7,
      needsLawyer: true,
      evidence: [{ snippet: "Trích đoạn tài liệu (mock).", legalBasisToVerify: "Cần luật sư xác minh căn cứ." }],
    }));
    return { findings };
  }

  async check(input: { findings: AiFindingDraft[] }): Promise<AiCheckerResult> {
    return evidenceChecker(input.findings);
  }
}

// JSON schema cho Claude structured output (output_config.format).
const CLAUDE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          groupKey: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
          recommendation: { type: "string" },
          confidence: { type: "number" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { snippet: { type: "string" }, legalBasisToVerify: { type: "string" } },
              required: ["snippet", "legalBasisToVerify"],
            },
          },
        },
        required: ["groupKey", "title", "description", "riskLevel", "recommendation", "confidence", "evidence"],
      },
    },
  },
  required: ["findings"],
} as const;

class LlmAiAdapter implements AiAdapter {
  readonly name = "claude";
  readonly mode = "llm" as const;

  async analyze(input: AiAnalyzeInput): Promise<AiAnalysisResult> {
    const docs = input.ocrText.filter((t) => t && t.trim().length > 0);
    if (docs.length === 0) return { findings: [] };

    const cfg = effectiveAiConfig();
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: cfg.anthropicKey });
    const createMessage = client.messages.create.bind(client.messages) as unknown as (
      body: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: string; text?: string }> }>;

    const res = await createMessage({
      model: cfg.anthropicModel,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: CLAUDE_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserContent(input, docs) }],
    });

    const raw = res.content.find((b) => b.type === "text")?.text ?? "{}";
    let parsed: { findings?: RawFinding[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { findings: [] };
    }
    return { findings: toFindingDrafts(parsed.findings ?? [], input.scope) };
  }

  async check(input: { findings: AiFindingDraft[] }): Promise<AiCheckerResult> {
    return evidenceChecker(input.findings);
  }
}

class GeminiAiAdapter implements AiAdapter {
  readonly name = "gemini";
  readonly mode = "gemini" as const;

  async analyze(input: AiAnalyzeInput): Promise<AiAnalysisResult> {
    const docs = input.ocrText.filter((t) => t && t.trim().length > 0);
    if (docs.length === 0) return { findings: [] };

    const cfg = effectiveAiConfig();
    const { GoogleGenerativeAI, SchemaType } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(cfg.geminiKey);
    const S = SchemaType;
    const responseSchema = {
      type: S.OBJECT,
      properties: {
        findings: {
          type: S.ARRAY,
          items: {
            type: S.OBJECT,
            properties: {
              groupKey: { type: S.STRING },
              title: { type: S.STRING },
              description: { type: S.STRING },
              riskLevel: { type: S.STRING },
              recommendation: { type: S.STRING },
              confidence: { type: S.NUMBER },
              evidence: {
                type: S.ARRAY,
                items: {
                  type: S.OBJECT,
                  properties: { snippet: { type: S.STRING }, legalBasisToVerify: { type: S.STRING } },
                  required: ["snippet", "legalBasisToVerify"],
                },
              },
            },
            required: ["groupKey", "title", "description", "riskLevel", "recommendation", "confidence", "evidence"],
          },
        },
      },
      required: ["findings"],
    };
    const model = genAI.getGenerativeModel({
      model: cfg.geminiModel,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema as never },
    });

    const result = await model.generateContent(buildUserContent(input, docs));
    const raw = result.response.text() || "{}";
    let parsed: { findings?: RawFinding[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { findings: [] };
    }
    return { findings: toFindingDrafts(parsed.findings ?? [], input.scope) };
  }

  async check(input: { findings: AiFindingDraft[] }): Promise<AiCheckerResult> {
    return evidenceChecker(input.findings);
  }
}

export function getAiAdapter(): AiAdapter {
  if (isAiConfigured()) {
    return effectiveAiConfig().provider === "gemini" ? new GeminiAiAdapter() : new LlmAiAdapter();
  }
  return new MockAiAdapter();
}

export function isAiMock(): boolean {
  return getAiAdapter().mode === "mock";
}
