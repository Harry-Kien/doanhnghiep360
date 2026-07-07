import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileEdit, FileText, Gavel, Scale } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/legal360/metric-card";
import { CaseTable } from "@/components/legal360/case-table";
import { Badge } from "@/components/ui/badge";
import { requireSection } from "@/lib/guard";
import { listCases } from "@/server/services/cases";
import { getDb } from "@/server/db";

export const metadata = { title: "Review & Khảo sát — Legal360" };

const REVIEW_STATUSES = new Set(["lawyer_reviewing", "report_drafting", "report_revision"]);
const DRAFT_STATUSES = new Set(["report_drafting", "report_revision"]);

function SectionPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-subtitle">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function LawyerPage() {
  const viewer = requireSection("lawyer");
  const db = getDb();
  const all = listCases(viewer);
  const reviewQueue = all.filter((item) => REVIEW_STATUSES.has(item.status));
  const needDocs = all.filter((item) => item.status === "need_more_documents");
  const awaitingFindingReview = all.filter((item) => item.status === "lawyer_reviewing");
  const drafting = all.filter((item) => DRAFT_STATUSES.has(item.status));
  const approved = all.filter((item) => item.status === "approved");
  const manualFindings = db.findings.filter((finding) => finding.status === "ai_draft" || finding.status === "checker_flagged");

  const workspaceTitle =
    viewer.role === "staff"
      ? "Workspace chuyên viên pháp lý"
      : viewer.role === "reviewer"
        ? "Workspace reviewer / partner"
        : "Workspace luật sư";

  return (
    <AppShell
      role={viewer.role}
      active="/lawyer"
      surface="light"
      title={workspaceTitle}
      description="Hàng đợi xử lý nghiệp vụ: kiểm tra tài liệu, duyệt finding, soạn báo cáo và khóa bản final trước khi bàn giao khách hàng."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Chờ duyệt finding" value={awaitingFindingReview.length} icon={Gavel} tone="warning" href="/lawyer" />
          <MetricCard label="Đang soạn / sửa báo cáo" value={drafting.length} icon={FileEdit} href="/lawyer" />
          <MetricCard label="Cần khách bổ sung" value={needDocs.length} icon={AlertTriangle} tone="danger" href="/lawyer" />
          <MetricCard label="Đã duyệt chờ bàn giao" value={approved.length} icon={CheckCircle2} tone="success" href="/lawyer" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <SectionPanel
            title="Hồ sơ cần xử lý"
            description="Các hồ sơ đang ở bước luật sư/chuyên viên phải can thiệp."
            action={<Badge tone="warning">{reviewQueue.length} hồ sơ</Badge>}
          >
            <div className="p-4">
              <CaseTable
                items={reviewQueue}
                basePath="/cases"
                emptyTitle="Không có hồ sơ chờ review"
                emptyDescription="Khi hồ sơ chuyển sang giai đoạn review, nó sẽ xuất hiện ở đây."
              />
            </div>
          </SectionPanel>

          <SectionPanel title="Checklist nghiệp vụ" description="Những điểm phải chốt trước khi xuất báo cáo.">
            <div className="divide-y divide-border">
              {[
                {
                  icon: FileText,
                  title: "Evidence đầy đủ",
                  description: "Finding phải có trích dẫn từ tài liệu.",
                  count: `${manualFindings.length} cần xem`,
                },
                {
                  icon: Scale,
                  title: "Căn cứ pháp lý",
                  description: "Luật sư bổ sung điều khoản, nghị định, thông tư.",
                  count: "Bắt buộc",
                },
                {
                  icon: CheckCircle2,
                  title: "Approval cuối",
                  description: "Chỉ luật sư/reviewer được khóa bản final.",
                  count: `${approved.length} sẵn sàng`,
                },
              ].map((item) => (
                <div key={item.title} className="action-row">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <item.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-950 dark:text-slate-100">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                  <Badge tone="neutral">{item.count}</Badge>
                </div>
              ))}
            </div>
          </SectionPanel>
        </div>

        {needDocs.length > 0 ? (
          <SectionPanel
            title="Đang chờ khách bổ sung tài liệu"
            description="Các hồ sơ này cần Intake/CSKH nhắc khách trước khi luật sư có thể chốt finding."
            action={
              <Link href="/intake?status=need_more_documents" className="text-xs font-medium text-primary hover:underline">
                Chuyển Intake
              </Link>
            }
          >
            <div className="p-4">
              <CaseTable items={needDocs} basePath="/cases" />
            </div>
          </SectionPanel>
        ) : null}
      </div>
    </AppShell>
  );
}
