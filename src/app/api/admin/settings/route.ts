import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { getViewer } from "@/lib/session";
import { canAccessSection, ROLE_META } from "@/shared/roles";
import { SettingsValidationError, updateSettings, SETTING_KEYS, settingsStatus } from "@/server/services/settings";
import { ok, fail, failFromZod } from "@/lib/http";

// Chỉ admin được cài cấu hình/key hệ thống.
const schema = z.object({
  aiProvider: z.enum(["mock", "llm", "gemini"]).optional(),
  geminiApiKey: z.string().max(400).optional(),
  geminiModel: z.string().max(80).optional(),
  anthropicApiKey: z.string().max(400).optional(),
  anthropicModel: z.string().max(80).optional(),
  ocrProvider: z.enum(["mock", "local", "gemini"]).optional(),
});

export async function POST(req: NextRequest) {
  const viewer = getViewer();
  if (!viewer) return fail("UNAUTHORIZED", "Bạn cần đăng nhập.");
  if (!canAccessSection(viewer.role, "admin")) return fail("FORBIDDEN", "Chỉ admin được cấu hình hệ thống.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION_ERROR", "Body không hợp lệ.");
  }
  try {
    const input = schema.parse(body);
    const updates: Record<string, string> = {};
    if (input.aiProvider !== undefined) updates[SETTING_KEYS.aiProvider] = input.aiProvider;
    if (input.geminiApiKey !== undefined) updates[SETTING_KEYS.geminiKey] = input.geminiApiKey;
    if (input.geminiModel !== undefined) updates[SETTING_KEYS.geminiModel] = input.geminiModel;
    if (input.anthropicApiKey !== undefined) updates[SETTING_KEYS.anthropicKey] = input.anthropicApiKey;
    if (input.anthropicModel !== undefined) updates[SETTING_KEYS.anthropicModel] = input.anthropicModel;
    if (input.ocrProvider !== undefined) updates[SETTING_KEYS.ocrProvider] = input.ocrProvider;

    updateSettings(updates, { id: viewer.id, label: ROLE_META[viewer.role].label });
    return ok(settingsStatus());
  } catch (err) {
    if (err instanceof ZodError) return failFromZod(err);
    if (err instanceof SettingsValidationError) return fail("VALIDATION_ERROR", err.message);
    return fail("INTERNAL_ERROR", "Không thể lưu cấu hình.");
  }
}
