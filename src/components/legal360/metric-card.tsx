import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const toneClass = {
  default: {
    icon: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    value: "text-slate-950 dark:text-slate-100",
  },
  warning: {
    icon: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
  danger: {
    icon: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    value: "text-red-700 dark:text-red-300",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
  },
} as const;

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  hint?: string;
  tone?: keyof typeof toneClass;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", toneClass[tone].icon)}>
          {Icon ? <Icon className="size-4" /> : <TrendingUp className="size-4" />}
        </span>
        {href ? <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /> : null}
      </div>
      <div className="mt-3">
        <p className={cn("text-2xl font-semibold tracking-tight", toneClass[tone].value)}>{value}</p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </>
  );

  const className =
    "group rounded-lg border border-border bg-card p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm dark:hover:border-slate-700 dark:hover:bg-slate-950";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
