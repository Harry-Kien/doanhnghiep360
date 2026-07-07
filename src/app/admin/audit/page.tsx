import { History, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { AuditLogTable } from "@/components/legal360/audit-log-table";
import { Badge } from "@/components/ui/badge";
import { requireSection } from "@/lib/guard";
import { listAuditLogs } from "@/server/services/audit";

export const metadata = { title: "Audit log — Legal360" };

export default function AuditLogPage() {
  const viewer = requireSection("admin");
  const logs = listAuditLogs({ limit: 200 });
  return (
    <AppShell
      role={viewer.role}
      active="/admin/audit"
      title="Nhật ký hệ thống"
      description="Theo dõi mọi hành động quan trọng: tạo lead, chuyển trạng thái, tạo Drive, review, xuất báo cáo."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <History className="size-4" />
            </span>
            <p className="mt-3 text-2xl font-semibold">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Bản ghi đang hiển thị</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold">Audit-first workflow</p>
            <p className="mt-1 text-xs text-muted-foreground">Mọi bước nhạy cảm đều để lại dấu vết kiểm tra.</p>
          </div>
        </div>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Audit log</h2>
              <p className="section-subtitle">Bảng kiểm soát dành cho admin và vận hành.</p>
            </div>
            <Badge tone="outline">200 mới nhất</Badge>
          </div>
          <div className="p-4">
            <AuditLogTable logs={logs} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
