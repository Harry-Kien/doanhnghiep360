import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { RoadmapItem } from "@/shared/types";

const PHASES: { key: RoadmapItem["phase"]; label: string }[] = [
  { key: "d30", label: "30 ngày" },
  { key: "d60", label: "60 ngày" },
  { key: "d90", label: "90 ngày" },
];

const PRIORITY_TONE: Record<RoadmapItem["priority"], "danger" | "warning" | "neutral"> = {
  high: "danger",
  med: "warning",
  low: "neutral",
};
const PRIORITY_LABEL: Record<RoadmapItem["priority"], string> = { high: "Ưu tiên cao", med: "Trung bình", low: "Thấp" };
const STATUS_LABEL: Record<RoadmapItem["status"], string> = { open: "Chưa xử lý", in_progress: "Đang xử lý", done: "Hoàn tất" };

export function RoadmapBoard({ items }: { items: RoadmapItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PHASES.map((p) => {
        const phaseItems = items.filter((i) => i.phase === p.key);
        return (
          <div key={p.key} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Roadmap {p.label}</p>
              <Badge tone="neutral">{phaseItems.length}</Badge>
            </div>
            <div className="space-y-3 p-4">
              {phaseItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có hạng mục.</p>
              ) : (
                phaseItems.map((item) => (
                  <div key={item.id} className="rounded-md border bg-background p-3">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={PRIORITY_TONE[item.priority]}>{PRIORITY_LABEL[item.priority]}</Badge>
                      <span className="text-muted-foreground">{STATUS_LABEL[item.status]}</span>
                      {item.dueAt ? <span className="text-muted-foreground">· hạn {formatDate(item.dueAt)}</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
