import { CASE_STATUS_META, type CaseStatus } from "@/shared/status";
import { Badge } from "@/components/ui/badge";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const meta = CASE_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
