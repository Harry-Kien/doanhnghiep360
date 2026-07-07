import { Bot, FileSearch, KeyRound } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { SettingsForm } from "@/components/app/settings-form";
import { Badge } from "@/components/ui/badge";
import { requireSection } from "@/lib/guard";
import { settingsStatus } from "@/server/services/settings";

export const metadata = { title: "Cấu hình hệ thống — Legal360" };

export default function SettingsPage() {
  const viewer = requireSection("admin");
  const status = settingsStatus();
  const allowMockProviders = process.env.NODE_ENV !== "production";

  return (
    <AppShell
      role={viewer.role}
      active="/admin/settings"
      title="Cấu hình hệ thống"
      description="Cài API key và chọn nhà cung cấp AI / OCR. Key chỉ ghi vào DB, không hiển thị lại toàn bộ."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Bot className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold">AI Provider</p>
            <p className="mt-1 text-xs text-muted-foreground">Claude, Gemini hoặc mock theo môi trường.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <FileSearch className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold">OCR Provider</p>
            <p className="mt-1 text-xs text-muted-foreground">Local/Gemini cho PDF, DOCX và ảnh scan.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <KeyRound className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold">Bảo mật key</p>
            <p className="mt-1 text-xs text-muted-foreground">Chỉ lưu ẩn, audit action không log secret.</p>
          </div>
        </div>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <KeyRound className="size-4" />
                AI & OCR
              </h2>
              <p className="section-subtitle">Cài key và provider cho runtime hiện tại.</p>
            </div>
            <Badge tone="outline">Admin only</Badge>
          </div>
          <div className="p-4">
            <SettingsForm initial={status} allowMockProviders={allowMockProviders} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
