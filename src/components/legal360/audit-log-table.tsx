import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./empty-state";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/shared/types";

const ACTION_LABEL: Record<string, string> = {
  "lead.created": "Tạo lead",
  "case.created": "Tạo hồ sơ",
  "case.transition": "Chuyển trạng thái",
  "case.opened": "Mở hồ sơ",
  "drive.provisioned": "Tạo thư mục Drive",
  "drive.failed": "Lỗi tạo Drive",
  "finding.review": "Review finding",
  "ai.analyzed": "AI phân tích",
  "settings.updated": "Cập nhật cấu hình",
  "report.approved": "Duyệt báo cáo",
  "report.locked": "Khóa báo cáo final",
};

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <EmptyState icon={History} title="Chưa có nhật ký" description="Các hành động quan trọng sẽ được ghi lại tại đây." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Hành động</th>
              <th>Người thực hiện</th>
              <th className="hidden md:table-cell">Đối tượng</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                <td>
                  <Badge tone={log.action === "drive.failed" ? "danger" : "neutral"}>
                    {ACTION_LABEL[log.action] ?? log.action}
                  </Badge>
                </td>
                <td className="text-muted-foreground">{log.actorLabel ?? "Hệ thống"}</td>
                <td className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                  {log.entityType}:{log.entityId?.slice(0, 12) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
