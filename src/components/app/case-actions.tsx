"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, FolderPlus, FileCheck2, ShieldCheck, AlertTriangle, X, Briefcase, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaseStatus } from "@/shared/status";

type ActionKind = "transition" | "open" | "report" | "report-approve" | "ai-analyze";

interface PrimaryAction {
  label: string;
  kind: ActionKind;
  toStatus?: CaseStatus;
  icon: LucideIcon;
}

// Lưu ý: các bước thương mại (lead_verified → payment_pending) KHÔNG có nút generic ở đây —
// chúng được thực hiện ở tab "Thương mại" để luôn tạo record (conflict/báo phí/hợp đồng/thanh toán).
const PRIMARY: Partial<Record<CaseStatus, PrimaryAction>> = {
  lead_new: { label: "Xác thực khách hàng", kind: "transition", toStatus: "lead_verified", icon: ArrowRight },
  payment_pending: { label: "Xác nhận thanh toán & mở hồ sơ", kind: "open", icon: FolderPlus },
  case_opened: { label: "Mở cổng upload tài liệu", kind: "transition", toStatus: "waiting_documents", icon: ArrowRight },
  waiting_documents: { label: "Đã nhận đủ tài liệu", kind: "transition", toStatus: "documents_received", icon: ArrowRight },
  documents_received: { label: "Bắt đầu kiểm tra tài liệu", kind: "transition", toStatus: "document_reviewing", icon: ArrowRight },
  document_reviewing: { label: "Đưa vào OCR", kind: "transition", toStatus: "ocr_processing", icon: ArrowRight },
  need_more_documents: { label: "Khách đã bổ sung", kind: "transition", toStatus: "documents_received", icon: ArrowRight },
  ocr_processing: { label: "Hoàn tất OCR — phân loại", kind: "transition", toStatus: "ai_classifying", icon: ArrowRight },
  ai_classifying: { label: "Chạy AI phân tích rủi ro", kind: "ai-analyze", icon: Bot },
  ai_analyzing: { label: "Chuyển luật sư review", kind: "transition", toStatus: "lawyer_reviewing", icon: ArrowRight },
  lawyer_reviewing: { label: "Tạo bản nháp báo cáo", kind: "report", icon: FileCheck2 },
  report_drafting: { label: "Duyệt & xuất báo cáo final", kind: "report-approve", icon: ShieldCheck },
  report_revision: { label: "Quay lại review", kind: "transition", toStatus: "lawyer_reviewing", icon: ArrowRight },
  approved: { label: "Gửi báo cáo cho khách", kind: "transition", toStatus: "delivered", icon: ArrowRight },
  delivered: { label: "Chuyển theo dõi roadmap", kind: "transition", toStatus: "roadmap_followup", icon: ArrowRight },
  roadmap_followup: { label: "Đề xuất hợp đồng thường xuyên", kind: "transition", toStatus: "retainer_proposed", icon: ArrowRight },
  retainer_proposed: { label: "Hoàn tất hồ sơ", kind: "transition", toStatus: "completed", icon: ShieldCheck },
};

const CLOSED: CaseStatus[] = ["completed", "cancelled"];
const CAN_REQUEST_DOCS: CaseStatus[] = ["document_reviewing", "ocr_processing", "lawyer_reviewing"];
const COMMERCIAL: CaseStatus[] = [
  "lead_verified",
  "conflict_checking",
  "conflict_cleared",
  "proposal_sent",
  "contract_pending",
  "payment_pending",
];

export function CaseActions({
  caseId,
  status,
  canAct = true,
  ownerLaneLabel = "bộ phận phụ trách",
}: {
  caseId: string;
  status: CaseStatus;
  canAct?: boolean;
  ownerLaneLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function call(url: string, body?: unknown, key = "primary") {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Thao tác thất bại.");
        return;
      }
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(null);
    }
  }

  function runPrimary(a: PrimaryAction) {
    if (a.kind === "transition" && a.toStatus) return call(`/api/cases/${caseId}/transition`, { toStatus: a.toStatus });
    if (a.kind === "open") return call(`/api/cases/${caseId}/open`);
    if (a.kind === "report") return call(`/api/cases/${caseId}/report`);
    if (a.kind === "report-approve") return call(`/api/cases/${caseId}/report/approve`);
    if (a.kind === "ai-analyze") return call(`/api/cases/${caseId}/ai/analyze`);
  }

  const primary = PRIMARY[status];
  const isClosed = CLOSED.includes(status);

  // Vai trò không phụ trách bước này ⇒ chỉ theo dõi, không hiện nút thao tác.
  if (!canAct) {
    if (isClosed) return null;
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
        <Briefcase className="size-4" />
        Bước này do <span className="font-medium text-foreground">{ownerLaneLabel}</span> phụ trách — bạn theo dõi tiến trình, không cần thao tác.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {COMMERCIAL.includes(status) ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
          <Briefcase className="size-4" />
          Bước thương mại — thực hiện ở tab <span className="font-medium text-foreground">“Thương mại”</span> (conflict check, báo phí, hợp đồng, thanh toán).
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {primary ? (
          <Button onClick={() => runPrimary(primary)} disabled={pending !== null}>
            {pending === "primary" ? <Loader2 className="size-4 animate-spin" /> : <primary.icon className="size-4" />}
            {primary.label}
          </Button>
        ) : null}

        {CAN_REQUEST_DOCS.includes(status) ? (
          <Button
            variant="outline"
            onClick={() => call(`/api/cases/${caseId}/transition`, { toStatus: "need_more_documents" }, "more")}
            disabled={pending !== null}
          >
            {pending === "more" ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
            Yêu cầu bổ sung tài liệu
          </Button>
        ) : null}

        {!isClosed ? (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => call(`/api/cases/${caseId}/transition`, { toStatus: "cancelled" }, "cancel")}
            disabled={pending !== null}
          >
            {pending === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Hủy hồ sơ
          </Button>
        ) : null}
      </div>
      {error ? <p className="rounded-md bg-red-50 p-2.5 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
