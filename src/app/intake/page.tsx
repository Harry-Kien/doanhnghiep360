import Link from "next/link";
import { AlertTriangle, Banknote, FileCheck2, Inbox, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/legal360/metric-card";
import { CaseTable } from "@/components/legal360/case-table";
import { Input } from "@/components/ui/input";
import { requireSection } from "@/lib/guard";
import { listCases } from "@/server/services/cases";
import { isCaseStatus, CASE_STATUS_META, type CaseStatus } from "@/shared/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lead & Hồ sơ — Legal360" };

const FILTERS: { key: string; label: string; status?: CaseStatus }[] = [
  { key: "all", label: "Tất cả" },
  { key: "lead_new", label: "Lead mới", status: "lead_new" },
  { key: "info_form_sent", label: "Chờ Mẫu 01", status: "info_form_sent" },
  { key: "info_form_uploaded", label: "Đã nhận Mẫu 01", status: "info_form_uploaded" },
  { key: "lead_verified", label: "Đã xác thực", status: "lead_verified" },
  { key: "conflict_checking", label: "Conflict", status: "conflict_checking" },
  { key: "proposal_sent", label: "Báo phí", status: "proposal_sent" },
  { key: "contract_pending", label: "Hợp đồng", status: "contract_pending" },
  { key: "payment_pending", label: "Thanh toán", status: "payment_pending" },
  { key: "waiting_documents", label: "Chờ tài liệu", status: "waiting_documents" },
  { key: "need_more_documents", label: "Cần bổ sung", status: "need_more_documents" },
  { key: "lawyer_reviewing", label: "Luật sư review", status: "lawyer_reviewing" },
  { key: "delivered", label: "Đã giao", status: "delivered" },
];

function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-subtitle">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function IntakePage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const viewer = requireSection("intake");
  const status = searchParams.status && isCaseStatus(searchParams.status) ? searchParams.status : undefined;
  const q = searchParams.q?.trim() || undefined;
  const cases = listCases(viewer, { status, q });
  const allCases = listCases(viewer);

  const leadCount = allCases.filter((item) => item.status === "lead_new" || item.status === "lead_verified").length;
  const commercialCount = allCases.filter((item) =>
    ["conflict_checking", "conflict_cleared", "proposal_sent", "contract_pending", "payment_pending"].includes(item.status),
  ).length;
  const documentCount = allCases.filter((item) =>
    ["info_form_sent", "info_form_uploaded", "waiting_documents", "documents_received", "document_reviewing", "need_more_documents"].includes(item.status),
  ).length;
  const blockedCount = allCases.filter((item) => item.status === "need_more_documents").length;

  return (
    <AppShell
      role={viewer.role}
      active="/intake"
      surface="light"
      title="Tiếp nhận & điều phối hồ sơ"
      description="Workspace cho Intake/Sales và chuyên viên pháp lý: nhận lead, kiểm tra conflict, theo dõi thương mại, gom tài liệu và đẩy hồ sơ sang review."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Lead cần xử lý" value={leadCount} icon={Inbox} href="/intake?status=lead_new" />
          <MetricCard label="Thương mại đang chạy" value={commercialCount} icon={Banknote} href="/intake?status=proposal_sent" />
          <MetricCard label="Tài liệu / khảo sát" value={documentCount} icon={FileCheck2} href="/intake?status=waiting_documents" />
          <MetricCard label="Cần bổ sung" value={blockedCount} icon={AlertTriangle} tone="warning" href="/intake?status=need_more_documents" />
        </div>

        <SectionPanel
          title="Bộ lọc vận hành"
          description="Lọc nhanh theo đúng bước quy trình Legal360, không trộn lead với review hoặc bàn giao."
        >
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => {
                  const isActive = (filter.key === "all" && !status) || filter.status === status;
                  const href = filter.status ? `/intake?status=${filter.status}` : "/intake";
                  return (
                    <Link
                      key={filter.key}
                      href={href}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        isActive
                          ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                          : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {filter.label}
                    </Link>
                  );
                })}
              </div>
              <form className="relative w-full sm:w-auto" action="/intake" method="get">
                {status ? <input type="hidden" name="status" value={status} /> : null}
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Tìm doanh nghiệp, MST, email, mã hồ sơ"
                  className="w-full rounded-lg pl-9 sm:w-80"
                />
              </form>
            </div>

            {status ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4" />
                Đang lọc: <span className="font-medium text-foreground">{CASE_STATUS_META[status].label}</span> · {cases.length} hồ sơ
              </div>
            ) : null}
          </div>
        </SectionPanel>

        <SectionPanel title="Danh sách hồ sơ" description="Ưu tiên xử lý theo trạng thái, bước tiếp theo và người phụ trách.">
          <div className="p-4">
            <CaseTable
              items={cases}
              basePath="/cases"
              emptyTitle="Không có hồ sơ phù hợp"
              emptyDescription="Thử bỏ bộ lọc hoặc từ khóa tìm kiếm khác."
            />
          </div>
        </SectionPanel>
      </div>
    </AppShell>
  );
}
