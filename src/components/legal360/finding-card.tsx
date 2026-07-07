import { FileText, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskLevelBadge } from "./risk-level-badge";
import type { LegalFinding, FindingStatus } from "@/shared/types";
import { SURVEY_SCOPE } from "@/shared/constants";

const FINDING_STATUS_META: Record<FindingStatus, { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = {
  ai_draft: { label: "AI nháp", tone: "info" },
  checker_flagged: { label: "Checker cảnh báo", tone: "warning" },
  lawyer_accepted: { label: "Luật sư đã duyệt", tone: "success" },
  lawyer_edited: { label: "Luật sư đã sửa & duyệt", tone: "success" },
  rejected: { label: "Đã từ chối", tone: "neutral" },
};

function groupLabel(key: string): string {
  return SURVEY_SCOPE.find((s) => s.key === key)?.label ?? key;
}

export function FindingCard({ finding, actions }: { finding: LegalFinding; actions?: React.ReactNode }) {
  const sm = FINDING_STATUS_META[finding.status];
  const hasEvidence = finding.evidence.length > 0;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{finding.code}</span>
            <span>·</span>
            <span>{groupLabel(finding.groupKey)}</span>
          </div>
          <h4 className="mt-1 text-sm font-semibold text-foreground">{finding.title}</h4>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <RiskLevelBadge level={finding.riskLevel} />
          <Badge tone={sm.tone}>{sm.label}</Badge>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{finding.description}</p>

      {finding.recommendation ? (
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground">Khuyến nghị: </span>
          <span className="text-muted-foreground">{finding.recommendation}</span>
        </p>
      ) : null}

      <div className="mt-3 rounded-md bg-secondary/60 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          {hasEvidence ? <ShieldCheck className="size-3.5 text-emerald-600" /> : <ShieldAlert className="size-3.5 text-red-600" />}
          {hasEvidence ? "Chứng cứ từ tài liệu" : "Chưa có chứng cứ — không được đưa vào báo cáo final"}
        </div>
        {finding.evidence.map((ev) => (
          <div key={ev.id} className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <FileText className="mt-0.5 size-3.5 shrink-0" />
            <div>
              <p className="italic">“{ev.snippet}”</p>
              {ev.legalBasis ? <p className="mt-0.5">Căn cứ: {ev.legalBasis}</p> : <p className="mt-0.5 text-amber-600">Cần luật sư bổ sung căn cứ pháp luật.</p>}
            </div>
          </div>
        ))}
      </div>

      {finding.confidence != null ? (
        <p className="mt-2 text-xs text-muted-foreground">Độ tin cậy AI: {Math.round(finding.confidence * 100)}%</p>
      ) : null}

      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  );
}
