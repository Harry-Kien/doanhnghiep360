import { ArrowRight } from "lucide-react";
import { CASE_STATUS_META, type CaseStatus } from "@/shared/status";
import { CaseStatusBadge } from "./case-status-badge";

const LANE_LABEL: Record<string, string> = {
  customer: "Khách hàng",
  intake: "Intake / Sales",
  staff: "Chuyên viên",
  ai: "Hệ thống AI",
  lawyer: "Luật sư",
  reviewer: "Reviewer / Partner",
  cskh: "CSKH",
  system: "Hệ thống",
  none: "—",
};

export function NextActionCard({ status }: { status: CaseStatus }) {
  const meta = CASE_STATUS_META[status];
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-accent/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <CaseStatusBadge status={status} />
        <div className="flex items-center gap-2 text-sm">
          <ArrowRight className="size-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{meta.nextAction}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Phụ trách: {LANE_LABEL[meta.ownerLane] ?? meta.ownerLane}</span>
    </div>
  );
}
