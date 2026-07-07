import { Check } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { TimelineEntry } from "@/shared/dto";

export function WorkflowTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có lịch sử trạng thái.</p>;
  }
  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {entries.map((e, i) => {
        const isLast = i === entries.length - 1;
        return (
          <li key={`${e.status}-${e.at}-${i}`} className="relative">
            <span
              className={`absolute -left-[31px] flex size-5 items-center justify-center rounded-full ring-4 ring-background ${
                isLast ? "bg-primary text-primary-foreground" : "bg-emerald-500 text-white"
              }`}
            >
              <Check className="size-3" />
            </span>
            <p className="text-sm font-medium text-foreground">{e.label}</p>
            {e.note ? <p className="mt-0.5 text-sm text-muted-foreground">{e.note}</p> : null}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDateTime(e.at)}
              {e.changedBy ? ` · ${e.changedBy}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
