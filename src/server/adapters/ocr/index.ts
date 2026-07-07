// OCR / trích xuất văn bản. mock | local (pdf-parse + mammoth) | gemini (local + OCR ảnh bằng Gemini vision).
// Cấu hình lấy từ settings (DB override env) để cài qua Admin.
import { effectiveOcrProvider, effectiveAiConfig } from "@/server/services/settings";

export interface OcrInput {
  fileName: string;
  mimeType: string;
  /** Bytes thật của tệp (bắt buộc để trích text thật; thiếu ⇒ chỉ trả placeholder). */
  content?: Buffer;
}

export interface OcrResult {
  text: string;
  pages: number;
  confidence: number;
  fields: Record<string, string>;
}

export interface OcrAdapter {
  readonly name: string;
  readonly mode: "mock" | "local" | "gemini";
  extract(input: OcrInput): Promise<OcrResult>;
}

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png"]);

class MockOcrAdapter implements OcrAdapter {
  readonly name = "mock";
  readonly mode = "mock" as const;
  async extract(input: OcrInput): Promise<OcrResult> {
    return {
      text: `[MOCK OCR] Nội dung trích xuất từ ${input.fileName}.`,
      pages: 1,
      confidence: 0.82,
      fields: { documentName: input.fileName, detectedType: "unknown" },
    };
  }
}

/** Trích text từ PDF (text layer) + DOCX. Ảnh: trả rỗng (cần provider gemini). */
async function extractLocal(input: OcrInput): Promise<OcrResult> {
  if (!input.content || input.content.length === 0) {
    return { text: "", pages: 0, confidence: 0, fields: { documentName: input.fileName, note: "no-content" } };
  }
  try {
    if (input.mimeType === PDF_MIME) {
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default as (b: Buffer) => Promise<{ text: string; numpages: number }>;
      const res = await pdf(input.content);
      const text = (res.text || "").trim();
      return { text, pages: res.numpages || 1, confidence: text.length > 20 ? 0.95 : 0.3, fields: { documentName: input.fileName, detectedType: "pdf" } };
    }
    if (input.mimeType === DOCX_MIME) {
      const mammoth = await import("mammoth");
      const res = await mammoth.extractRawText({ buffer: input.content });
      const text = (res.value || "").trim();
      return { text, pages: 1, confidence: text.length > 20 ? 0.95 : 0.3, fields: { documentName: input.fileName, detectedType: "docx" } };
    }
    return { text: "", pages: 0, confidence: 0, fields: { documentName: input.fileName, detectedType: input.mimeType, note: "unsupported-local-ocr" } };
  } catch {
    return { text: "", pages: 0, confidence: 0, fields: { documentName: input.fileName, note: "ocr-error" } };
  }
}

export class LocalOcrAdapter implements OcrAdapter {
  readonly name = "local";
  readonly mode = "local" as const;
  extract(input: OcrInput): Promise<OcrResult> {
    return extractLocal(input);
  }
}

/** PDF/DOCX dùng local; ẢNH (jpg/png) dùng Gemini vision để OCR thật. */
export class GeminiOcrAdapter implements OcrAdapter {
  readonly name = "gemini";
  readonly mode = "gemini" as const;

  async extract(input: OcrInput): Promise<OcrResult> {
    if (input.mimeType === PDF_MIME || input.mimeType === DOCX_MIME) {
      return extractLocal(input);
    }
    if (!input.content || !IMAGE_MIMES.has(input.mimeType)) {
      return { text: "", pages: 0, confidence: 0, fields: { documentName: input.fileName, note: "unsupported" } };
    }
    const { geminiKey, geminiModel } = effectiveAiConfig();
    if (!geminiKey) {
      return { text: "", pages: 0, confidence: 0, fields: { documentName: input.fileName, note: "no-gemini-key" } };
    }
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: geminiModel });
      const result = await model.generateContent([
        { inlineData: { mimeType: input.mimeType, data: input.content.toString("base64") } },
        { text: "Trích xuất TOÀN BỘ văn bản trong ảnh tài liệu này. Chỉ trả về text thuần, giữ nguyên nội dung, không bình luận." },
      ]);
      const text = (result.response.text() || "").trim();
      return { text, pages: 1, confidence: text.length > 20 ? 0.9 : 0.3, fields: { documentName: input.fileName, detectedType: "image", engine: "gemini-vision" } };
    } catch {
      return { text: "", pages: 0, confidence: 0, fields: { documentName: input.fileName, note: "gemini-ocr-error" } };
    }
  }
}

export function getOcrAdapter(): OcrAdapter {
  const p = effectiveOcrProvider();
  if (p === "gemini") return new GeminiOcrAdapter();
  if (p === "local") return new LocalOcrAdapter();
  return new MockOcrAdapter();
}

export function isOcrMock(): boolean {
  return getOcrAdapter().mode === "mock";
}
