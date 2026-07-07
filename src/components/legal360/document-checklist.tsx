import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { DOCUMENT_CHECKLIST } from "@/shared/constants";
import { cn } from "@/lib/utils";

export interface ChecklistState {
  /** số file đã upload theo categoryKey */
  countByKey: Record<string, number>;
}

export function DocumentChecklist({ state }: { state: ChecklistState }) {
  const requiredItems = DOCUMENT_CHECKLIST.filter((i) => i.required);
  const requiredDone = requiredItems.filter((i) => (state.countByKey[i.key] ?? 0) > 0).length;
  const optionalDone = DOCUMENT_CHECKLIST.filter((i) => !i.required && (state.countByKey[i.key] ?? 0) > 0).length;
  const allRequiredDone = requiredDone === requiredItems.length;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
          allRequiredDone ? "border-emerald-200 bg-emerald-50/60 text-emerald-700" : "border-amber-200 bg-amber-50/60 text-amber-700",
        )}
      >
        <span className="font-medium">
          {allRequiredDone ? "Đã đủ hồ sơ bắt buộc" : "Còn thiếu hồ sơ bắt buộc"}
        </span>
        <span className="text-xs">
          Bắt buộc {requiredDone}/{requiredItems.length} · Tùy chọn {optionalDone}/{DOCUMENT_CHECKLIST.length - requiredItems.length}
        </span>
      </div>
      <ul className="divide-y divide-border rounded-lg border">
      {DOCUMENT_CHECKLIST.map((item) => {
        const count = state.countByKey[item.key] ?? 0;
        const done = count > 0;
        const missingRequired = item.required && !done;
        return (
          <li key={item.key} className="flex items-center gap-3 p-3">
            {done ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            ) : missingRequired ? (
              <AlertCircle className="size-5 shrink-0 text-amber-500" />
            ) : (
              <Circle className="size-5 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {item.label}
                {item.required ? <span className="ml-1 text-red-500">*</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{item.hint}</p>
            </div>
            <span
              className={cn(
                "shrink-0 text-xs font-medium",
                done ? "text-emerald-600" : missingRequired ? "text-amber-600" : "text-muted-foreground",
              )}
            >
              {done ? `${count} tệp` : missingRequired ? "Cần bổ sung" : "Tùy chọn"}
            </span>
          </li>
        );
      })}
      </ul>
    </div>
  );
}
