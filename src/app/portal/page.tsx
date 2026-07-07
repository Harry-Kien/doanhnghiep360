import { redirect } from "next/navigation";
import { AlertTriangle, FileText, Lock, Download, UploadCloud } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaseStatusBadge } from "@/components/legal360/case-status-badge";
import { NextActionCard } from "@/components/legal360/next-action-card";
import { WorkflowTimeline } from "@/components/legal360/workflow-timeline";
import { DocumentChecklist } from "@/components/legal360/document-checklist";
import { RoadmapBoard } from "@/components/legal360/roadmap-board";
import { EmptyState } from "@/components/legal360/empty-state";
import { DocumentUploadBox } from "@/components/app/document-upload-box";
import { DocumentDeleteButton } from "@/components/app/document-delete-button";
import { CommercialPortal } from "@/components/app/commercial-portal";
import { SURVEY_REQUEST_FORM_CATEGORY, isCustomerUploadableKey } from "@/shared/constants";
import { requireAuth } from "@/lib/guard";
import { getCaseDetail } from "@/server/services/cases";
import { listProposals, listContracts, listPayments } from "@/server/services/commercial";
import { getReportView, listRoadmap } from "@/server/services/report-build";
import { countByCategory, listDocuments, CUSTOMER_DELETABLE_STATUSES } from "@/server/services/documents";
import { getDb } from "@/server/db";
import { CASE_STATUS_META } from "@/shared/status";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Cổng khách hàng — Legal360" };

export default function PortalPage() {
  const viewer = requireAuth("/portal");
  if (viewer.role !== "customer") {
    redirect(viewer.role === "lawyer" || viewer.role === "reviewer" || viewer.role === "staff" ? "/lawyer" : "/admin");
  }

  const db = getDb();
  const myCases = db.cases
    .filter((c) => c.orgId === viewer.orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = myCases[0];

  if (!current) {
    return (
      <EmptyState
        title="Bạn chưa có hồ sơ khảo sát"
        description="Khi bạn đăng ký dịch vụ khảo sát, hồ sơ sẽ xuất hiện tại đây."
      />
    );
  }

  const detail = getCaseDetail(viewer, current.id);
  if (!detail || "forbidden" in detail) {
    return <EmptyState title="Không truy cập được hồ sơ" description="Vui lòng liên hệ bộ phận tiếp nhận." />;
  }

  const docs = listDocuments(current.id);
  const countByKey = countByCategory(current.id);
  const surveyRequestDocs = docs.filter((doc) => doc.categoryKey === SURVEY_REQUEST_FORM_CATEGORY.key);
  const latestSurveyRequestDoc = surveyRequestDocs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

  // Khối thương mại (báo phí/hợp đồng/thanh toán) — lấy bản mới nhất.
  const latestProposal = listProposals(current.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const latestContract = listContracts(current.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const payments = listPayments(current.id);

  const { versions } = getReportView(current.id);
  const finalVersion = versions.find((v) => v.kind === "final");
  const roadmap = listRoadmap(current.id);
  const needMore = current.status === "need_more_documents";
  const canUpload = [
    "info_form_sent",
    "info_form_uploaded",
    "waiting_documents",
    "need_more_documents",
    "case_opened",
    "documents_received",
  ].includes(current.status);
  const canUploadSurveyRequestForm = ![
    "final_report_ready",
    "delivered",
    "roadmap_followup",
    "retainer_proposal_sent",
    "retainer_proposed",
    "completed",
    "cancelled",
  ].includes(current.status);
  const canDeleteDocs = (CUSTOMER_DELETABLE_STATUSES as readonly string[]).includes(current.status);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1B33] p-6 text-white sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Hồ sơ khảo sát pháp lý 360°</p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{detail.organization.name}</h1>
            <p className="mt-1 font-mono text-sm text-white/60">{detail.caseCode ?? "Đang chờ mở hồ sơ"}</p>
          </div>
          <CaseStatusBadge status={current.status} />
        </div>
      </div>

      <NextActionCard status={current.status} />

      {needMore ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Luật sư yêu cầu bổ sung tài liệu</p>
            <p>Vui lòng tải lên các tài liệu còn thiếu theo checklist bên dưới để tiếp tục quá trình khảo sát.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CommercialPortal
            caseId={current.id}
            caseCode={detail.caseCode}
            orgName={detail.organization.name}
            proposal={latestProposal}
            contract={latestContract}
            payments={payments}
          />

          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <FileText className="size-5 text-blue-700" /> Mẫu 01 - Phiếu yêu cầu khảo sát
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["Bước 1", "Tải Mẫu 01"],
                  ["Bước 2", "Điền thông tin doanh nghiệp"],
                  ["Bước 3", "Upload phiếu đã điền"],
                ].map(([step, label]) => (
                  <div key={step} className="rounded-lg border border-blue-100 bg-white/75 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{step}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm leading-6 text-slate-600">
                  <p>Khách hàng tải Mẫu 01, điền đầy đủ nội dung khảo sát và gửi lại để Legal360 tiếp nhận hồ sơ.</p>
                  <p className="mt-1">
                    Trạng thái:{" "}
                    <Badge tone={latestSurveyRequestDoc ? "success" : "warning"}>
                      {latestSurveyRequestDoc ? "Đã nhận phiếu" : "Chưa nhận phiếu"}
                    </Badge>
                  </p>
                </div>
                <a
                  href="/api/templates/survey-request-form"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  <Download className="size-4" />
                  Tải Mẫu 01
                </a>
              </div>
              {latestSurveyRequestDoc ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Đã nhận: {latestSurveyRequestDoc.originalName} · {formatDateTime(latestSurveyRequestDoc.createdAt)}
                </div>
              ) : null}
              {canUploadSurveyRequestForm ? (
                <DocumentUploadBox
                  caseId={current.id}
                  defaultCategory={SURVEY_REQUEST_FORM_CATEGORY.key}
                  lockCategory
                  accept=".docx,.pdf"
                  buttonLabel="Tải phiếu đã điền"
                  helperText="Chỉ nhận DOCX hoặc PDF · tối đa 25MB."
                />
              ) : (
                <p className="text-sm text-muted-foreground">Hồ sơ đã qua giai đoạn nhận phiếu khảo sát.</p>
              )}
            </CardContent>
          </Card>

          {canUpload ? (
            <Card className="border-primary/40 bg-primary/[0.03]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <UploadCloud className="size-5 text-primary" /> Tải tài liệu lên
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Chọn đúng nhóm tài liệu rồi tải tệp lên. Hệ thống tự lưu an toàn vào kho hồ sơ của doanh nghiệp bạn.
                </p>
                <DocumentUploadBox caseId={current.id} defaultCategory="01" />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Checklist tài liệu cần nộp</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DocumentChecklist state={{ countByKey }} />
              {!canUpload ? (
                <p className="text-sm text-muted-foreground">Giai đoạn hiện tại không cần tải thêm tài liệu.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Tài liệu đã gửi ({docs.length})</CardTitle></CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <EmptyState icon={FileText} title="Chưa có tài liệu" description="Tải tài liệu đầu tiên ở khung bên trên." />
              ) : (
                <ul className="divide-y divide-border rounded-lg border">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.originalName}</p>
                        <p className="truncate text-xs text-muted-foreground">{formatDateTime(d.createdAt)}</p>
                      </div>
                      {d.status !== "drive_error" && d.driveFileId ? (
                        <a
                          href={`/api/cases/${current.id}/documents/${d.id}/download`}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Tải xuống tài liệu"
                        >
                          <Download className="size-3.5" /> Tải
                        </a>
                      ) : null}
                      <Badge tone={d.status === "drive_error" ? "danger" : "success"}>
                        {d.status === "drive_error" ? "Lỗi lưu trữ" : "Đã nhận"}
                      </Badge>
                      {canDeleteDocs && d.uploaderId === viewer.id && isCustomerUploadableKey(d.categoryKey) ? (
                        <DocumentDeleteButton caseId={current.id} docId={d.id} fileName={d.originalName} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Báo cáo khảo sát</CardTitle></CardHeader>
            <CardContent>
              {finalVersion ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-emerald-50/50 p-4">
                  <Lock className="size-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Báo cáo final (phiên bản {finalVersion.version}) đã được luật sư phê duyệt</p>
                    <p className="text-xs text-muted-foreground">Phát hành {formatDateTime(finalVersion.createdAt)}</p>
                  </div>
                  <span className="flex gap-2">
                    <a href={`/api/cases/${current.id}/report/download?format=docx`} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"><Download className="size-3.5" /> DOCX</a>
                    <a href={`/api/cases/${current.id}/report/download?format=html`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"><Download className="size-3.5" /> Xem / In PDF</a>
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Báo cáo đang trong quá trình {CASE_STATUS_META[current.status].label.toLowerCase()}. Bạn sẽ nhận được báo cáo
                  PDF/DOCX sau khi luật sư hoàn tất review và phê duyệt.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Tiến trình hồ sơ</CardTitle></CardHeader>
          <CardContent><WorkflowTimeline entries={detail.timeline} /></CardContent>
        </Card>
      </div>

      {roadmap.length > 0 ? (
        <div>
          <h2 className="mb-3 font-display text-xl font-semibold">Roadmap xử lý 30-90 ngày</h2>
          <RoadmapBoard items={roadmap} />
        </div>
      ) : null}
    </div>
  );
}
