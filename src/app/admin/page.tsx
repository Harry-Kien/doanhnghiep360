import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Gavel,
  History,
  Inbox,
  Loader2,
  LucideIcon,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { CaseStatusBadge } from "@/components/legal360/case-status-badge";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/server/db";
import { getDashboardMetrics, listCases } from "@/server/services/cases";
import { requireSection } from "@/lib/guard";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { PACKAGE_META, SURVEY_REQUEST_FORM_CATEGORY, VND } from "@/shared/constants";
import { CASE_STATUS_META, type CaseStatus } from "@/shared/status";
import type { CaseListItem } from "@/shared/dto";

export const metadata = { title: "Tổng quan - Legal360" };

const CUSTOMER_WAITING: CaseStatus[] = [
  "info_form_sent",
  "proposal_sent",
  "contract_pending",
  "payment_pending",
  "waiting_documents",
  "need_more_documents",
  "report_sent_to_customer",
];

const REVIEW_QUEUE: CaseStatus[] = [
  "lawyer_analysis",
  "lawyer_reviewing",
  "report_drafting",
  "report_revision",
  "reviewer_approval",
  "final_report_ready",
  "approved",
];
const AI_QUEUE: CaseStatus[] = ["ocr_processing", "ai_classifying", "ai_analyzing"];
const DOCUMENT_QUEUE: CaseStatus[] = [
  "info_form_sent",
  "info_form_uploaded",
  "waiting_documents",
  "documents_received",
  "online_meeting_scheduled",
  "online_meeting_done",
  "checklist_in_progress",
  "onsite_survey_scheduled",
  "onsite_survey_done",
  "document_reviewing",
  "need_more_documents",
];
const DONE_STATUSES: CaseStatus[] = ["delivered", "roadmap_followup", "retainer_proposal_sent", "retainer_proposed", "completed"];

function AdminPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ExecutiveMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "amber" | "slate";
  href: string;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-lg ring-1", toneClass)}>
          <Icon className="size-5" />
        </span>
        <ArrowRight className="size-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
    </Link>
  );
}

function PriorityItem({
  title,
  description,
  count,
  href,
  icon: Icon,
  tone,
}: {
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  tone: "danger" | "warning" | "info" | "success";
}) {
  const toneClass = {
    danger: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
    info: "bg-blue-50 text-blue-700",
    success: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <Link href={href} className="group flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneClass)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">{title}</span>
        <span className="block truncate text-xs text-slate-500">{description}</span>
      </span>
      <Badge tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "info"}>
        {count}
      </Badge>
      <ArrowRight className="size-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function FlowStage({
  step,
  title,
  owner,
  description,
  count,
  total,
  icon: Icon,
  tone,
  href,
}: {
  step: string;
  title: string;
  owner: string;
  description: string;
  count: number;
  total: number;
  icon: LucideIcon;
  tone: "blue" | "cyan" | "violet" | "amber" | "emerald";
  href: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    cyan: "bg-cyan-50 text-cyan-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[tone];
  const barClass = {
    blue: "bg-blue-600",
    cyan: "bg-cyan-600",
    violet: "bg-violet-600",
    amber: "bg-amber-500",
    emerald: "bg-emerald-600",
  }[tone];

  return (
    <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-5" />
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{step}</span>
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{owner}</p>
        <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="text-2xl font-semibold tracking-tight text-slate-950">{count}</span>
        <ArrowRight className="mb-1 size-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${percent}%` }} />
      </div>
    </Link>
  );
}

function StatusBar({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-slate-500">{label}</span>
        <span className="font-semibold text-slate-950">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-950" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AdminCaseList({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: CaseListItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-slate-950">{emptyTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Doanh nghiệp</th>
              <th className="px-4 py-3 font-semibold">Mã hồ sơ</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Bước tiếp theo</th>
              <th className="hidden px-4 py-3 font-semibold lg:table-cell">Phụ trách</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Ngày tạo</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => (
              <tr key={item.caseId} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/cases/${item.caseId}`} className="block min-w-[220px]">
                    <span className="font-semibold text-slate-950">{item.companyName}</span>
                    <span className="block text-xs text-slate-500">
                      {item.contactName} · {item.email}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.caseCode ?? "-"}</td>
                <td className="px-4 py-3">
                  <CaseStatusBadge status={item.status} />
                </td>
                <td className="hidden max-w-[270px] px-4 py-3 text-xs text-slate-500 md:table-cell">
                  {CASE_STATUS_META[item.status].nextAction}
                </td>
                <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{item.assignedLawyerName ?? "-"}</td>
                <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/cases/${item.caseId}`}
                    className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950"
                    aria-label={`Mở hồ sơ ${item.companyName}`}
                  >
                    <ArrowRight className="size-4" />
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

export default function AdminDashboardPage() {
  const viewer = requireSection("admin");
  const metrics = getDashboardMetrics(viewer);
  const cases = listCases(viewer);
  const recent = cases.slice(0, 6);
  const db = getDb();

  const totalActive = cases.filter((item) => !DONE_STATUSES.includes(item.status) && item.status !== "cancelled").length;
  const pipelineValue = db.cases.reduce((sum, item) => sum + (item.package ? PACKAGE_META[item.package].price : 0), 0);
  const openPipelineValue = db.cases
    .filter((item) => !DONE_STATUSES.includes(item.status) && item.status !== "cancelled")
    .reduce((sum, item) => sum + (item.package ? PACKAGE_META[item.package].price : 0), 0);
  const bottlenecks = cases.filter((item) => item.status === "need_more_documents" || item.status === "lawyer_reviewing");
  const reviewQueue = cases.filter((item) => REVIEW_QUEUE.includes(item.status));
  const documentQueue = cases.filter((item) => DOCUMENT_QUEUE.includes(item.status));
  const aiQueue = cases.filter((item) => AI_QUEUE.includes(item.status));
  const customerWaiting = cases.filter((item) => CUSTOMER_WAITING.includes(item.status));
  const deliveryQueue = cases.filter((item) =>
    ["report_sent_to_customer", "explanation_meeting_done", "delivered", "roadmap_followup", "retainer_proposal_sent", "retainer_proposed"].includes(item.status),
  );
  const overdueSla = cases.filter(
    (item) =>
      item.slaDueAt &&
      new Date(item.slaDueAt).getTime() < Date.now() &&
      !DONE_STATUSES.includes(item.status) &&
      item.status !== "cancelled",
  );
  const pendingPayments = db.payments.filter((payment) => payment.status !== "paid");
  const findingsToReview = db.findings.filter((finding) => finding.status === "ai_draft" || finding.status === "checker_flagged");
  const surveyRequestCaseIds = new Set(
    db.documents
      .filter((document) => document.status !== "deleted" && document.categoryKey === SURVEY_REQUEST_FORM_CATEGORY.key)
      .map((document) => document.caseId),
  );
  const pendingSurveyRequests = cases.filter(
    (item) => !surveyRequestCaseIds.has(item.caseId) && !DONE_STATUSES.includes(item.status) && item.status !== "cancelled",
  );
  const receivedSurveyRequests = cases.filter((item) => surveyRequestCaseIds.has(item.caseId));
  const recentActivities = [...db.auditLogs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  const flowTotal = Math.max(metrics.totalLeads, 1);
  const completionRate = metrics.totalLeads > 0 ? Math.round((metrics.delivered / metrics.totalLeads) * 100) : 0;

  return (
    <AppShell
      role={viewer.role}
      active="/admin"
      surface="light"
      title="Trung tâm điều hành Legal360"
      description="Theo dõi toàn bộ vòng đời hồ sơ: lead, tài liệu, AI/OCR, luật sư review, báo cáo, thanh toán và chăm sóc sau bàn giao."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/intake"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Inbox className="size-4" />
            Mở hồ sơ
          </Link>
          <Link
            href="/admin/providers"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ShieldCheck className="size-4" />
            Tích hợp
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-6">
              <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.35),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.22),transparent_34%)]" />
              <div className="relative max-w-3xl">
                <Badge tone="info" className="bg-white/10 text-blue-100">
                  Legal Operations Command Center
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Quản trị vận hành pháp lý 360 theo đúng vai trò và đúng điểm nghẽn.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Admin nhìn thấy sức khỏe toàn hệ thống, còn từng nhóm nhân sự xử lý phần việc của mình: intake, chuyên viên pháp lý, AI/OCR, luật sư, kế toán và CSKH.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                    <CheckCircle2 className="size-4 text-emerald-300" />
                    {completionRate}% đã bàn giao
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                    <Workflow className="size-4 text-blue-300" />
                    {totalActive} hồ sơ đang chạy
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                    <CalendarClock className="size-4 text-amber-300" />
                    {overdueSla.length} quá hạn SLA
                  </span>
                </div>
              </div>
            </div>

            <div className="grid content-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Giá trị pipeline mở</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{VND.format(openPipelineValue)}</p>
                <p className="mt-1 text-xs text-slate-500">Tổng danh mục: {VND.format(pipelineValue)}</p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">Cần luật sư duyệt</span>
                  <span className="text-sm font-semibold text-slate-950">{findingsToReview.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">Chờ khách phản hồi</span>
                  <span className="text-sm font-semibold text-slate-950">{customerWaiting.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">Chờ Mẫu 01</span>
                  <span className="text-sm font-semibold text-slate-950">{pendingSurveyRequests.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">Thanh toán treo</span>
                  <span className="text-sm font-semibold text-slate-950">{pendingPayments.length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetric
            label="Tổng lead/hồ sơ"
            value={metrics.totalLeads}
            hint="Toàn bộ hồ sơ đã đi vào hệ thống"
            icon={Inbox}
            tone="blue"
            href="/intake"
          />
          <ExecutiveMetric
            label="Đang xử lý"
            value={metrics.inProgress}
            hint="Chưa đóng, cần theo dõi tiến độ"
            icon={Loader2}
            tone="slate"
            href="/intake"
          />
          <ExecutiveMetric
            label="Điểm nghẽn"
            value={bottlenecks.length}
            hint="Thiếu tài liệu hoặc đang chờ review"
            icon={AlertTriangle}
            tone="amber"
            href="#bottlenecks"
          />
          <ExecutiveMetric
            label="Đã bàn giao"
            value={metrics.delivered}
            hint={`${completionRate}% trên tổng hồ sơ`}
            icon={FileCheck2}
            tone="emerald"
            href="/intake"
          />
        </div>

        <AdminPanel
          title="Bản đồ vận hành theo vai trò"
          description="Luồng 5 bước giúp admin biết việc đang nằm ở bộ phận nào, không gom tất cả vào một danh sách dài."
        >
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
            <FlowStage
              step="01"
              title="Intake / Sales"
              owner="Lead - conflict - báo phí"
              description="Tiếp nhận, xác thực, kiểm tra xung đột lợi ích và chốt phạm vi."
              count={metrics.totalLeads}
              total={flowTotal}
              href="/intake"
              icon={BriefcaseBusiness}
              tone="blue"
            />
            <FlowStage
              step="02"
              title="Tài liệu & OCR"
              owner="Chuyên viên pháp lý"
              description="Checklist, tài liệu bắt buộc, OCR và chuẩn hóa evidence."
              count={documentQueue.length}
              total={flowTotal}
              href="/intake"
              icon={ClipboardCheck}
              tone="cyan"
            />
            <FlowStage
              step="03"
              title="AI phân tích"
              owner="AI/OCR providers"
              description="Phân loại tài liệu, sinh finding nháp và điểm rủi ro."
              count={aiQueue.length}
              total={flowTotal}
              href="/admin/providers"
              icon={Sparkles}
              tone="violet"
            />
            <FlowStage
              step="04"
              title="Luật sư review"
              owner="Lawyer / reviewer"
              description="Duyệt finding, soạn báo cáo, chỉnh sửa và khóa bản final."
              count={reviewQueue.length}
              total={flowTotal}
              href="/lawyer"
              icon={Scale}
              tone="amber"
            />
            <FlowStage
              step="05"
              title="Bàn giao & CSKH"
              owner="Kế toán / CSKH"
              description="Thanh toán, bàn giao báo cáo, roadmap 30-90 ngày và retainer."
              count={deliveryQueue.length}
              total={flowTotal}
              href="/intake"
              icon={Banknote}
              tone="emerald"
            />
          </div>
        </AdminPanel>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <AdminPanel
            title="Việc ưu tiên hôm nay"
            description="Các việc có khả năng làm chậm toàn bộ hồ sơ nếu không xử lý trước."
          >
            <PriorityItem
              title="Hồ sơ quá hạn SLA"
              description="Cần điều phối lại hoặc nhắc người phụ trách."
              count={overdueSla.length}
              href="/intake"
              icon={CalendarClock}
              tone={overdueSla.length > 0 ? "danger" : "success"}
            />
            <PriorityItem
              title="Chờ khách nộp Mẫu 01"
              description="Phiếu yêu cầu khảo sát chưa được upload lại."
              count={pendingSurveyRequests.length}
              href="/intake?status=info_form_sent"
              icon={ClipboardCheck}
              tone="warning"
            />
            <PriorityItem
              title="Khách hàng đang giữ bước tiếp theo"
              description="Báo phí, hợp đồng, thanh toán hoặc bổ sung tài liệu."
              count={customerWaiting.length}
              href="/intake"
              icon={Users}
              tone="warning"
            />
            <PriorityItem
              title="Finding cần luật sư duyệt"
              description="AI draft/checker flagged chưa được chốt nghiệp vụ."
              count={findingsToReview.length}
              href="/lawyer"
              icon={Gavel}
              tone="info"
            />
            <PriorityItem
              title="Mẫu 01 đã nhận"
              description="Hồ sơ đã có phiếu yêu cầu khảo sát để intake kiểm tra."
              count={receivedSurveyRequests.length}
              href="/intake?status=info_form_uploaded"
              icon={FileCheck2}
              tone="success"
            />
            <PriorityItem
              title="Thanh toán chưa hoàn tất"
              description="Các mốc phí ảnh hưởng bước mở hồ sơ hoặc bàn giao."
              count={pendingPayments.length}
              href="/intake"
              icon={Banknote}
              tone="warning"
            />
          </AdminPanel>

          <AdminPanel title="Pipeline theo trạng thái" description="Tỷ trọng hồ sơ ở từng bước đang hoạt động.">
            <div className="space-y-3 p-4">
              {metrics.byStatus.slice(0, 8).map((status) => (
                <StatusBar key={status.status} label={status.label} count={status.count} total={flowTotal} />
              ))}
            </div>
          </AdminPanel>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <AdminPanel
            title="Hồ sơ gần đây"
            description="Các hồ sơ vừa tạo hoặc vừa cập nhật để admin nắm nhịp vận hành."
            action={
              <Link href="/intake" className="text-xs font-semibold text-blue-700 hover:underline">
                Xem tất cả
              </Link>
            }
          >
            <div className="p-4">
              <AdminCaseList
                items={recent}
                emptyTitle="Chưa có hồ sơ"
                emptyDescription="Hồ sơ mới sẽ xuất hiện ở đây sau khi khách hàng gửi khảo sát."
              />
            </div>
          </AdminPanel>

          <AdminPanel
            title="Hoạt động gần đây"
            description="Audit log rút gọn cho admin theo dõi thay đổi."
            action={
              <Link href="/admin/audit" className="text-xs font-semibold text-blue-700 hover:underline">
                Nhật ký
              </Link>
            }
          >
            {recentActivities.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <History className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-950">{activity.action}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {activity.actorLabel ?? "Hệ thống"} · {formatDateTime(activity.createdAt)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-sm text-slate-500">Chưa có hoạt động.</div>
            )}
          </AdminPanel>
        </div>

        <AdminPanel
          title="Hồ sơ đang nghẽn"
          description="Các hồ sơ cần bổ sung tài liệu hoặc đang chờ luật sư xử lý."
          className="scroll-mt-24"
        >
          <div id="bottlenecks" className="p-4">
            <AdminCaseList
              items={bottlenecks}
              emptyTitle="Không có hồ sơ nghẽn"
              emptyDescription="Tất cả hồ sơ đang đi đúng tiến độ."
            />
          </div>
        </AdminPanel>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Lead & hồ sơ", href: "/intake", icon: Inbox },
            { label: "Review luật sư", href: "/lawyer", icon: Gavel },
            { label: "Cấu hình", href: "/admin/settings", icon: Settings },
            { label: "Tích hợp", href: "/admin/providers", icon: ShieldCheck },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <item.icon className="size-4" />
              </span>
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
