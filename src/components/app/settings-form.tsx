"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export interface SettingsStatus {
  aiProvider: string;
  aiActive: boolean;
  aiLabel: string;
  geminiModel: string;
  anthropicModel: string;
  ocrProvider: string;
  gemini: { configured: boolean; hint: string | null; fromEnv: boolean };
  anthropic: { configured: boolean; hint: string | null; fromEnv: boolean };
}

function KeyState({ state }: { state: { configured: boolean; hint: string | null; fromEnv: boolean } }) {
  if (!state.configured) return <Badge tone="warning">Chưa cài</Badge>;
  return (
    <span className="inline-flex items-center gap-2">
      <Badge tone="success">Đã cài {state.hint}</Badge>
      {state.fromEnv ? <span className="text-xs text-muted-foreground">từ .env</span> : null}
    </span>
  );
}

export function SettingsForm({ initial, allowMockProviders = false }: { initial: SettingsStatus; allowMockProviders?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = React.useState({
    aiProvider: initial.aiProvider,
    ocrProvider: initial.ocrProvider,
    geminiModel: initial.geminiModel,
    geminiApiKey: "",
    anthropicModel: initial.anthropicModel,
    anthropicApiKey: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = {
        aiProvider: form.aiProvider,
        ocrProvider: form.ocrProvider,
        geminiModel: form.geminiModel,
        anthropicModel: form.anthropicModel,
      };
      if (form.geminiApiKey.trim()) payload.geminiApiKey = form.geminiApiKey.trim();
      if (form.anthropicApiKey.trim()) payload.anthropicApiKey = form.anthropicApiKey.trim();

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMessage({ kind: "err", text: json?.error?.message ?? "Lưu thất bại." });
        return;
      }
      setMessage({ kind: "ok", text: `Đã lưu cấu hình. Trạng thái AI: ${json.data.aiLabel}` });
      setForm((current) => ({ ...current, geminiApiKey: "", anthropicApiKey: "" }));
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: "Không thể kết nối máy chủ." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">AI rà soát pháp lý</h3>
            <p className="mt-1 text-xs text-muted-foreground">Chọn provider phân tích finding và evidence.</p>
          </div>
          <Badge tone={initial.aiActive ? "success" : "warning"}>
            {initial.aiActive ? `Đang chạy: ${initial.aiLabel}` : "Chưa kết nối AI thật"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nhà cung cấp AI</Label>
            <Select value={form.aiProvider} onChange={(event) => set("aiProvider", event.target.value)} disabled={pending}>
              {allowMockProviders ? <option value="mock">Chế độ local/test, không gọi AI thật</option> : null}
              {!allowMockProviders && form.aiProvider === "mock" ? <option value="mock">Chưa cấu hình, cần đổi trước go-live</option> : null}
              <option value="gemini">Gemini, Google AI Studio</option>
              <option value="llm">Claude, Anthropic</option>
            </Select>
          </div>
          <div />
          <div>
            <Label>Gemini API key {form.aiProvider === "gemini" ? "*" : ""}</Label>
            <Input
              type="password"
              value={form.geminiApiKey}
              onChange={(event) => set("geminiApiKey", event.target.value)}
              placeholder={initial.gemini.configured ? "Để trống nếu giữ nguyên" : "Dán key AIza..."}
              disabled={pending}
              autoComplete="off"
            />
            <div className="mt-1">
              <KeyState state={initial.gemini} />
            </div>
          </div>
          <div>
            <Label>Gemini model</Label>
            <Input value={form.geminiModel} onChange={(event) => set("geminiModel", event.target.value)} placeholder="gemini-2.5-flash" disabled={pending} />
          </div>
          <div>
            <Label>Anthropic API key {form.aiProvider === "llm" ? "*" : ""}</Label>
            <Input
              type="password"
              value={form.anthropicApiKey}
              onChange={(event) => set("anthropicApiKey", event.target.value)}
              placeholder={initial.anthropic.configured ? "Để trống nếu giữ nguyên" : "Dán key sk-ant-..."}
              disabled={pending}
              autoComplete="off"
            />
            <div className="mt-1">
              <KeyState state={initial.anthropic} />
            </div>
          </div>
          <div>
            <Label>Claude model</Label>
            <Input value={form.anthropicModel} onChange={(event) => set("anthropicModel", event.target.value)} placeholder="claude-opus-4-8" disabled={pending} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">OCR / trích xuất tài liệu</h3>
          <p className="mt-1 text-xs text-muted-foreground">Chọn engine đọc PDF, DOCX và ảnh scan.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nhà cung cấp OCR</Label>
            <Select value={form.ocrProvider} onChange={(event) => set("ocrProvider", event.target.value)} disabled={pending}>
              {allowMockProviders ? <option value="mock">Chế độ local/test, không trích text thật</option> : null}
              {!allowMockProviders && form.ocrProvider === "mock" ? <option value="mock">Chưa cấu hình, cần đổi trước go-live</option> : null}
              <option value="local">Local, PDF text layer + DOCX</option>
              <option value="gemini">Gemini, PDF/DOCX + OCR ảnh</option>
            </Select>
          </div>
          <p className="self-end text-xs leading-5 text-muted-foreground">
            Chọn Gemini khi cần OCR ảnh chụp/scan. Provider này dùng chung Gemini key ở phần AI.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={pending} className="bg-slate-950 text-white hover:bg-slate-800">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu cấu hình
        </Button>
        {message ? (
          <span className={`flex items-center gap-1 text-sm ${message.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>
            {message.kind === "ok" ? <CheckCircle2 className="size-4" /> : null} {message.text}
          </span>
        ) : null}
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        <KeyRound className="mt-0.5 size-4 shrink-0" />
        Key chỉ hiển thị trạng thái và 4 ký tự cuối. Audit log ghi nhận hành động cập nhật nhưng không ghi giá trị secret.
      </p>
    </div>
  );
}
