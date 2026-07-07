import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CaseStatusBadge } from "./case-status-badge";
import { EmptyState } from "./empty-state";
import { CASE_STATUS_META } from "@/shared/status";
import { formatDate } from "@/lib/utils";
import type { CaseListItem } from "@/shared/dto";

export function CaseTable({
  items,
  basePath = "/cases",
  emptyTitle = "Chưa có hồ sơ",
  emptyDescription = "Hồ sơ mới sẽ xuất hiện ở đây.",
}: {
  items: CaseListItem[];
  basePath?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doanh nghiệp</th>
              <th>Mã hồ sơ</th>
              <th>Trạng thái</th>
              <th className="hidden md:table-cell">Bước tiếp theo</th>
              <th className="hidden lg:table-cell">Luật sư</th>
              <th className="hidden sm:table-cell">Ngày tạo</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.caseId}>
                <td>
                  <Link href={`${basePath}/${item.caseId}`} className="block min-w-[220px]">
                    <span className="font-medium text-slate-950 dark:text-slate-100">{item.companyName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.contactName} · {item.email}
                    </span>
                  </Link>
                </td>
                <td className="font-mono text-xs text-muted-foreground">{item.caseCode ?? "—"}</td>
                <td>
                  <CaseStatusBadge status={item.status} />
                </td>
                <td className="hidden max-w-[260px] text-xs text-muted-foreground md:table-cell">
                  {CASE_STATUS_META[item.status].nextAction}
                </td>
                <td className="hidden text-muted-foreground lg:table-cell">{item.assignedLawyerName ?? "—"}</td>
                <td className="hidden text-muted-foreground sm:table-cell">{formatDate(item.createdAt)}</td>
                <td className="text-right">
                  <Link
                    href={`${basePath}/${item.caseId}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={`Mở hồ sơ ${item.companyName}`}
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
