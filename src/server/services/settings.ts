// Cấu hình runtime cài qua Admin (lưu DB) — override biến môi trường.
// Key API CHỈ GHI: không trả lại giá trị thật cho client, chỉ trạng thái + 4 ký tự cuối.
import { getDb, commit } from "@/server/db";
import { env } from "@/lib/env";
import { recordAudit } from "@/server/services/audit";

export const SETTING_KEYS = {
  aiProvider: "AI_PROVIDER",
  geminiKey: "GEMINI_API_KEY",
  geminiModel: "GEMINI_MODEL",
  anthropicKey: "ANTHROPIC_API_KEY",
  anthropicModel: "ANTHROPIC_MODEL",
  ocrProvider: "OCR_PROVIDER",
} as const;

/** Tập key bí mật — không bao giờ trả giá trị thật ra ngoài. */
const SECRET_KEYS = new Set<string>([SETTING_KEYS.geminiKey, SETTING_KEYS.anthropicKey]);

function rawSetting(key: string): string {
  return getDb().settings?.[key] ?? "";
}

/** Giá trị hiệu lực = DB (nếu có) → biến môi trường. */
function effective(key: string, envFallback: string): string {
  const v = rawSetting(key);
  return v || envFallback;
}

export type AiProvider = "mock" | "llm" | "gemini";
export type OcrProvider = "mock" | "local" | "azure" | "google" | "gemini";

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

export interface EffectiveAiConfig {
  provider: AiProvider;
  anthropicKey: string;
  anthropicModel: string;
  geminiKey: string;
  geminiModel: string;
}

export function effectiveAiConfig(): EffectiveAiConfig {
  const provider = effective(SETTING_KEYS.aiProvider, env.aiProvider) as string;
  return {
    provider: (["mock", "llm", "gemini"].includes(provider) ? provider : "mock") as AiProvider,
    anthropicKey: effective(SETTING_KEYS.anthropicKey, env.anthropic.apiKey),
    anthropicModel: effective(SETTING_KEYS.anthropicModel, env.anthropic.model),
    geminiKey: effective(SETTING_KEYS.geminiKey, env.gemini.apiKey),
    geminiModel: effective(SETTING_KEYS.geminiModel, env.gemini.model),
  };
}

export function effectiveOcrProvider(): OcrProvider {
  const p = effective(SETTING_KEYS.ocrProvider, env.ocrProvider) as string;
  return (["mock", "local", "azure", "google", "gemini"].includes(p) ? p : "mock") as OcrProvider;
}

export function isAiConfigured(): boolean {
  const c = effectiveAiConfig();
  if (c.provider === "llm") return Boolean(c.anthropicKey);
  if (c.provider === "gemini") return Boolean(c.geminiKey);
  return false;
}

export function aiModelLabel(): string {
  const c = effectiveAiConfig();
  if (c.provider === "gemini") return `gemini (${c.geminiModel})`;
  if (c.provider === "llm") return `claude (${c.anthropicModel})`;
  return "mock";
}

export function validateProductionProviderSelection(
  updates: { aiProvider?: string; ocrProvider?: string },
  isProduction = process.env.NODE_ENV === "production",
): void {
  if (!isProduction) return;
  if (updates.aiProvider === "mock") {
    throw new SettingsValidationError("Production không được chọn AI_PROVIDER=mock. Hãy chọn Gemini hoặc Claude.");
  }
  if (updates.ocrProvider === "mock") {
    throw new SettingsValidationError("Production không được chọn OCR_PROVIDER=mock. Hãy chọn Local hoặc Gemini.");
  }
}

/** Cập nhật cấu hình. Bỏ qua giá trị rỗng cho key bí mật (để không xoá key khi không nhập lại). */
export function updateSettings(updates: Record<string, string>, actor: { id: string | null; label?: string }): void {
  validateProductionProviderSelection({
    aiProvider: updates[SETTING_KEYS.aiProvider],
    ocrProvider: updates[SETTING_KEYS.ocrProvider],
  });
  const db = getDb();
  if (!db.settings) db.settings = {};
  const changed: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (!Object.values(SETTING_KEYS).includes(key as never)) continue; // chỉ nhận key cho phép
    const trimmed = (value ?? "").trim();
    if (SECRET_KEYS.has(key) && trimmed === "") continue; // không nhập lại key ⇒ giữ nguyên
    db.settings[key] = trimmed;
    changed.push(key);
  }
  if (changed.length === 0) return;
  commit();
  recordAudit({
    actorId: actor.id,
    actorLabel: actor.label,
    action: "settings.updated",
    entityType: "settings",
    entityId: null,
    metadata: { keys: changed }, // KHÔNG ghi giá trị key bí mật
  });
}

function mask(value: string): string | null {
  if (!value) return null;
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

/** Trạng thái cấu hình cho trang Admin (không lộ key thật). */
export function settingsStatus() {
  const c = effectiveAiConfig();
  const ocr = effectiveOcrProvider();
  return {
    aiProvider: c.provider,
    aiActive: isAiConfigured(),
    aiLabel: aiModelLabel(),
    geminiModel: c.geminiModel,
    anthropicModel: c.anthropicModel,
    ocrProvider: ocr,
    gemini: { configured: Boolean(c.geminiKey), hint: mask(c.geminiKey), fromEnv: !rawSetting(SETTING_KEYS.geminiKey) && Boolean(env.gemini.apiKey) },
    anthropic: { configured: Boolean(c.anthropicKey), hint: mask(c.anthropicKey), fromEnv: !rawSetting(SETTING_KEYS.anthropicKey) && Boolean(env.anthropic.apiKey) },
  };
}
