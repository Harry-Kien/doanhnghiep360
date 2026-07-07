import { RISK_META, type RiskLevel } from "@/shared/constants";
import { Badge } from "@/components/ui/badge";

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const meta = RISK_META[level];
  return <Badge tone={meta.tone}>Rủi ro: {meta.label}</Badge>;
}
