import Link from "next/link";
import { ArrowLeft, FileCheck2, Hash, Scale, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: Hash, text: "Mã hồ sơ riêng và kho tài liệu chuẩn hóa" },
  { icon: ShieldCheck, text: "Phân quyền theo vai trò, ghi nhật ký mọi thao tác" },
  { icon: FileCheck2, text: "AI hỗ trợ, luật sư phê duyệt kết luận cuối" },
];

export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,460px)_1fr]">
      <aside className="relative hidden flex-col justify-between border-r border-border bg-card p-10 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Scale className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-tight">Legal360</span>
              <span className="block text-xs text-muted-foreground">Luật Ngọc Sơn</span>
            </span>
          </Link>

          <div className="mt-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Legal operating system</p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-slate-100">
              Không gian vận hành khảo sát pháp lý doanh nghiệp 360
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Từ tiếp nhận khách hàng, tài liệu, AI phân tích đến luật sư duyệt báo cáo final, mọi bước được gom về một hệ thống rõ vai trò.
            </p>
          </div>

          <ul className="mt-10 space-y-3">
            {POINTS.map((point) => (
              <li key={point.text} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                  <point.icon className="size-4" />
                </span>
                <span className="text-sm leading-5 text-muted-foreground">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Luật Ngọc Sơn</p>
      </aside>

      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5 lg:px-10">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Scale className="size-4" />
            </span>
            <span className="text-sm font-semibold">Legal360</span>
          </Link>
          <Link href="/" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Về trang chủ
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-10">{children}</main>
      </div>
    </div>
  );
}
