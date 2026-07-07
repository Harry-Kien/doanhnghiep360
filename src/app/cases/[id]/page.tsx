import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, Lock, Bot, ShieldCheck, Download } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CaseStatusBadge } from "@/components/legal360/case-status-badge";
import { NextActionCard } from "@/components/legal360/next-action-card";
import { WorkflowTimeline } from "@/components/legal360/workflow-timeline";
import { FindingCard } from "@/components/legal360/finding-card";
import { DocumentChecklist } from "@/components/legal360/document-checklist";
import { RoadmapBoard } from "@/components/legal360/roadmap-board";
import { EmptyState } from "@/components/legal360/empty-state";
import { CaseActions } from "@/components/app/case-actions";
import { FindingReviewActions } from "@/components/app/finding-review-actions";
import { AddFindingForm } from "@/components/app/add-finding-form";
import { DocumentDeleteButton } from "@/components/app/document-delete-button";
import { CommercialPanel } from "@/components/app/commercial-panel";
import { listProposals, listContracts, listPayments, latestConflictCheck } from "@/server/services/commercial";
import { requireAuth } from "@/lib/guard";
import { getCaseDetail } from "@/server/services/cases";
import { listFindings } from "@/server/services/findings";
import { getReportView, listRoadmap } from "@/server/services/report-build";
import { countByCategory, listDocuments } from "@/server/services/documents";
import { SURVEY_REQUEST_FORM_CATEGORY, SURVEY_SCOPE } from "@/shared/constants";
import { CASE_STATUS_META, type CaseStatus } from "@/shared/status";
import type { Role } from "@/shared/roles";
import { formatDateTime } from "@/lib/utils";

// Mỗi giai đoạn (theo ownerLane trong BPMN) do nhóm vai trò nào thao tác. Admin luôn được (siêu quyền).
const LANE_ACT_ROLES: Record<string, Role[]> = {
  intake: ["intake"],
  customer: ["intake", "staff"], // hành động nội bộ trên bước đang chờ khách (vd "đã nhận tài liệu")
  system: ["intake"],
  staff: ["staff", "intake"],
  ai: ["staff", "lawyer", "reviewer"],
  lawyer: ["lawyer", "reviewer"],
  reviewer: ["reviewer", "lawyer"],
  cskh: ["intake"],
  none: [],
};

const LANE_LABEL: Record<string, string> = {
  intake: "Intake / Sales",
  customer: "Khách hàng",
  system: "Hệ thống",
  staff: "Chuyên viên pháp lý",
  ai: "AI / OCR",
  lawyer: "Luật sư phụ trách",
  reviewer: "Reviewer / Partner",
  cskh: "CSKH",
  none: "—",
};

function canActOnStage(role: Role, status: CaseStatus): boolean {
  if (role === "admin") return true;
  // Kế toán xác nhận thanh toán xong thì được mở hồ sơ luôn (một đầu mối thu tiền → mở).
  if (status === "payment_pending" && (role === "accountant" || role === "intake")) return true;
  const lane = CASE_STATUS_META[status].ownerLane;
  return (LANE_ACT_ROLES[lane] ?? []).includes(role);
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const viewer = requireAuth(`/cases/${params.id}`);
  if (viewer.role === "customer") redirect("/portal");

  const detail = getCaseDetail(viewer, params.id);
  if (detail === null) notFound();
  if ("forbidden" in detail) redirect("/intake");

  const isLawyer = viewer.role === "lawyer" || viewer.role === "reviewer" || viewer.role === "admin";
  // Phân quyền hành động theo vai trò — mỗi nhóm chỉ thao tác phần việc của mình.
  const canCommercial = viewer.role === "intake" || viewer.role === "admin"; // conflict, báo phí, hợp đồng
  const canPayment = canCommercial || viewer.role === "accountant"; // ghi nhận thanh toán
  const canAct = canActOnStage(viewer.role, detail.status); // nút "việc tiếp theo"
  const active =
    viewer.role === "lawyer" || viewer.role === "staff" || viewer.role === "reviewer"
      ? "/lawyer"
      : viewer.role === "accountant"
        ? "/ke-toan"
        : "/intake";

  const findings = listFindings(params.id);
  const proposals = listProposals(params.id);
  const contracts = listContracts(params.id);
  const payments = listPayments(params.id);
  const conflict = latestConflictCheck(params.id);
  const { versions } = getReportView(params.id);
  const finalVersion = versions.find((v) => v.kind === "final");
  const roadmap = listRoadmap(params.id);

  const docs = listDocuments(params.id);
  const countByKey = countByCategory(params.id);
  const surveyRequestDocs = docs.filter((doc) => doc.categoryKey === SURVEY_REQUEST_FORM_CATEGORY.key);
  const latestSurveyRequestDoc = surveyRequestDocs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

  const scopeLabels = detail.scope.map((k) => SURVEY_SCOPE.find((s) => s.key === k)?.label ?? k);

  return (
    <AppShell
      role={viewer.role}
      active={active}
      title={detail.companyName}
      description={detail.caseCode ? `Mã hồ sơ ${detail.caseCode}` : "Hồ sơ chưa được mở chính thức"}
      actions={<Link href={active} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Danh sách</Link>}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <CaseStatusBadge status={detail.status} />
        {detail.package ? <Badge tone="info">Gói {detail.package}</Badge> : null}
        {detail.assignedLawyerName ? <Badge tone="neutral">Luật sư: {detail.assignedLawyerName}</Badge> : null}
        <span className="text-xs text-muted-foreground">Tạo {formatDateTime(detail.createdAt)}</span>
      </div>

      <NextActionCard status={detail.status} />

      <div className="mt-5">
        <CaseActions caseId={params.id} status={detail.status} canAct={canAct} ownerLaneLabel={LANE_LABEL[CASE_STATUS_META[detail.status].ownerLane] ?? "bộ phận phụ trách"} />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="commercial">Thương mại</TabsTrigger>
          <TabsTrigger value="documents">Tài liệu</TabsTrigger>
          <TabsTrigger value="analysis">Phân tích & Review</TabsTrigger>
          <TabsTrigger value="report">Báo cáo & Roadmap</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-4" /> Thông tin doanh nghiệp</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Info label="Tên doanh nghiệp" value={detail.organization.name} />
                  <Info label="Mã số thuế" value={detail.organization.taxCode ?? "—"} />
                  <Info label="Loại hình" value={detail.organization.businessType ?? "—"} />
                  <Info label="Ngành nghề" value={detail.organization.industry ?? "—"} />
                  <Info label="Số lao động" value={detail.organization.headcount?.toString() ?? "—"} />
                  <Info label="Thị trường" value={detail.organization.market ?? "—"} />
                  <Info label="Người liên hệ" value={`${detail.contact.fullName}${detail.contact.position ? ` · ${detail.contact.position}` : ""}`} />
                  <Info label="Liên hệ" value={`${detail.contact.email} · ${detail.contact.phone}`} />
                </dl>
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phạm vi khảo sát</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {scopeLabels.length ? scopeLabels.map((s) => <Badge key={s} tone="neutral">{s}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
                  </div>
                  {detail.objectives ? (
                    <p className="mt-3 text-sm"><span className="font-medium">Mục tiêu: </span><span className="text-muted-foreground">{detail.objectives}</span></p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tiến trình hồ sơ</CardTitle></CardHeader>
              <CardContent><WorkflowTimeline entries={detail.timeline} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COMMERCIAL */}
        <TabsContent value="commercial">
          <CommercialPanel
            caseId={params.id}
            status={detail.status}
            conflict={conflict}
            proposals={proposals}
            contracts={contracts}
            payments={payments}
            canCommercial={canCommercial}
            canPayment={canPayment}
          />
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-blue-200 bg-blue-50/50 lg:col-span-2">
              <CardHeader><CardTitle>Mẫu 01 - Phiếu yêu cầu khảo sát</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge tone={latestSurveyRequestDoc ? "success" : "warning"}>
                    {latestSurveyRequestDoc ? "Đã nhận phiếu" : "Chưa nhận phiếu"}
                  </Badge>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {latestSurveyRequestDoc
                      ? `${latestSurveyRequestDoc.originalName} · ${formatDateTime(latestSurveyRequestDoc.createdAt)}`
                      : "Khách hàng cần tải Mẫu 01, điền thông tin và upload lại trên cổng khách hàng."}
                  </p>
                </div>
                <span className="flex flex-wrap gap-2">
                  <a
                    href="/api/templates/survey-request-form"
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Download className="size-3.5" /> Tải mẫu
                  </a>
                  {latestSurveyRequestDoc?.driveFileId ? (
                    <a
                      href={`/api/cases/${params.id}/documents/${latestSurveyRequestDoc.id}/download`}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <Download className="size-3.5" /> Tải phiếu đã nộp
                    </a>
                  ) : null}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Checklist tài liệu</CardTitle></CardHeader>
              <CardContent><DocumentChecklist state={{ countByKey }} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Tài liệu đã nhận ({docs.length})</CardTitle></CardHeader>
              <CardContent>
                {docs.length === 0 ? (
                  <EmptyState icon={FileText} title="Chưa có tài liệu" description="Khách hàng upload tài liệu qua cổng khách hàng." />
                ) : (
                  <ul className="divide-y divide-border rounded-lg border">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{d.originalName}</p>
                          <p className="truncate text-xs text-muted-foreground">{d.storedName}</p>
                        </div>
                        {d.status !== "drive_error" && d.driveFileId ? (
                          <a
                            href={`/api/cases/${params.id}/documents/${d.id}/download`}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            title="Tải xuống tài liệu"
                          >
                            <Download className="size-3.5" /> Tải
                          </a>
                        ) : null}
                        <Badge tone="neutral">{d.status}</Badge>
                        <DocumentDeleteButton caseId={params.id} docId={d.id} fileName={d.originalName} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ANALYSIS & REVIEW */}
        <TabsContent value="analysis">
          <Card className="mb-4 border-violet-200 bg-violet-50/40">
            <CardContent className="flex items-start gap-3 pt-6 text-sm">
              <Bot className="mt-0.5 size-5 shrink-0 text-violet-600" />
              <div>
                <p className="font-medium text-foreground">AI Checker (bản nháp)</p>
                <p className="text-muted-foreground">
                  AI đã tạo {findings.length} phát hiện sơ bộ kèm chứng cứ. Mọi finding ở trạng thái nháp cho đến khi
                  luật sư duyệt. Finding thiếu chứng cứ sẽ không được đưa vào báo cáo final.
                </p>
              </div>
            </CardContent>
          </Card>

          {isLawyer ? (
            <div className="mb-4">
              <AddFindingForm caseId={params.id} />
            </div>
          ) : null}

          {findings.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Chưa có phát hiện" description="Phát hiện rủi ro sẽ xuất hiện sau khi AI phân tích, hoặc luật sư tự thêm." />
          ) : (
            <div className="space-y-4">
              {findings.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  actions={isLawyer ? <FindingReviewActions findingId={f.id} status={f.status} /> : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* REPORT & ROADMAP */}
        <TabsContent value="report">
          <Card className="mb-6">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Phiên bản báo cáo</CardTitle>
              {finalVersion ? <Badge tone="success"><Lock className="size-3" /> Bản final đã khóa</Badge> : <Badge tone="warning">Chưa có bản final</Badge>}
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Chưa có báo cáo"
                  description="Luật sư tạo bản nháp sau khi review, và xuất bản final sau khi duyệt toàn bộ finding."
                />
              ) : (
                <ul className="divide-y divide-border rounded-lg border">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center gap-3 p-3 text-sm">
                      <Badge tone={v.kind === "final" ? "success" : "neutral"}>{v.kind === "final" ? "Final" : "Nháp"}</Badge>
                      <span className="font-medium">Phiên bản {v.version}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)}</span>
                      {v.kind === "final" ? (
                        <span className="ml-auto flex gap-2 text-xs">
                          <a href={`/api/cases/${params.id}/report/download?format=docx`} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 font-medium text-primary-foreground transition-opacity hover:opacity-90"><Download className="size-3" /> DOCX</a>
                          <a href={`/api/cases/${params.id}/report/download?format=html`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded border border-primary px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/5"><Download className="size-3" /> Xem / In PDF</a>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Quy tắc: không thể xuất báo cáo final khi còn finding chưa duyệt hoặc chưa có luật sư phê duyệt.
              </p>
            </CardContent>
          </Card>

          <h3 className="mb-3 text-sm font-semibold">Roadmap xử lý 30-90 ngày</h3>
          {roadmap.length === 0 ? (
            <EmptyState title="Chưa có roadmap" description="Roadmap được tạo cùng báo cáo final." />
          ) : (
            <RoadmapBoard items={roadmap} />
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
