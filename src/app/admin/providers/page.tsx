import { AlertTriangle, CheckCircle2, Plug } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { requireSection } from "@/lib/guard";
import { getProvidersStatus } from "@/server/services/providers";

export const metadata = { title: "Provider status — Legal360" };

export default function ProvidersPage() {
  const viewer = requireSection("admin");
  const rows = getProvidersStatus();
  const realCount = rows.filter((row) => row.configured && row.mode !== "mock" && row.mode !== "optional").length;
  const optionalCount = rows.filter((row) => row.mode === "optional").length;
  const needsAttention = rows.filter((row) => !row.configured && row.mode !== "optional").length;

  return (
    <AppShell
      role={viewer.role}
      active="/admin/providers"
      title="Tình trạng tích hợp"
      description="Theo dõi Drive, OCR, AI, xuất báo cáo và các tích hợp tùy chọn đang sẵn sàng đến đâu."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Tổng dịch vụ</p>
            <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Kết nối thật</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{realCount}</p>
            {optionalCount > 0 ? <p className="mt-1 text-xs text-muted-foreground">{optionalCount} tích hợp tùy chọn chưa bật</p> : null}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Cần kiểm tra</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{needsAttention}</p>
          </div>
        </div>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <Plug className="size-4" />
                Drive / OCR / AI / Report / Sheet
              </h2>
              <p className="section-subtitle">Nguồn sự thật nhanh cho readiness tích hợp.</p>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th>Chế độ</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const optional = row.mode === "optional";
                  const real = row.configured && row.mode !== "mock" && !optional;
                  return (
                    <tr key={row.key}>
                      <td className="font-medium text-slate-950 dark:text-slate-100">{row.label}</td>
                      <td>
                        <Badge tone={real ? "success" : optional ? "neutral" : "warning"}>
                          {real ? "Đã kết nối thật" : optional ? "Chưa bật" : "Cần cấu hình"}
                        </Badge>
                      </td>
                      <td>
                        {real ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="size-4" /> Sẵn sàng
                          </span>
                        ) : optional ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            Tùy chọn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <AlertTriangle className="size-4" /> Cần cấu hình
                          </span>
                        )}
                      </td>
                      <td className="text-muted-foreground">{row.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
            Bật Google Drive thật bằng cách đặt <code className="rounded bg-secondary px-1">DRIVE_PROVIDER=google</code> và cấu hình service account trong
            <code className="rounded bg-secondary px-1">.env.local</code>. Xem <code className="rounded bg-secondary px-1">docs/provider-adapters.md</code>.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
