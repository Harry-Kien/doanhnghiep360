import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Gavel,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Plug,
  Scale,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { canAccessSection, ROLE_META, type AppSection, type Role } from "@/shared/roles";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "./theme-toggle";
import { getCurrentUserPublic } from "@/lib/session";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: AppSection;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Vận hành",
    items: [
      { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, section: "admin" },
      { href: "/intake", label: "Tiếp nhận & hồ sơ", icon: Inbox, section: "intake" },
      { href: "/lawyer", label: "Review & khảo sát", icon: Gavel, section: "lawyer" },
      { href: "/ke-toan", label: "Kế toán & thanh toán", icon: Wallet, section: "accounting" },
    ],
  },
  {
    title: "Quản trị",
    items: [
      { href: "/admin/users", label: "Quản lý người dùng", icon: Users, section: "admin" },
      { href: "/admin/settings", label: "Cấu hình hệ thống", icon: KeyRound, section: "admin" },
      { href: "/admin/providers", label: "Tích hợp", icon: Plug, section: "admin" },
      { href: "/admin/audit", label: "Nhật ký", icon: History, section: "admin" },
    ],
  },
];

export function AppShell({
  role,
  active,
  title,
  description,
  actions,
  surface = "default",
  children,
}: {
  role: Role;
  active: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  surface?: "default" | "light";
  children: React.ReactNode;
}) {
  const currentUser = getCurrentUserPublic();
  const isLightSurface = surface === "light";
  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessSection(role, item.section)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className={cn("flex min-h-screen", isLightSurface ? "bg-slate-50 text-slate-950" : "bg-background text-foreground")}>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col border-r lg:flex",
          isLightSurface ? "border-slate-200 bg-white text-slate-950 shadow-sm" : "border-border bg-card text-card-foreground",
        )}
      >
        <Link
          href="/admin"
          className={cn("flex h-16 items-center gap-3 border-b px-5", isLightSurface ? "border-slate-200" : "border-border")}
        >
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg shadow-sm",
              isLightSurface ? "bg-slate-950 text-white" : "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
            )}
          >
            <Scale className="size-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold tracking-tight">Legal360</span>
            <span className={cn("block truncate text-[11px]", isLightSurface ? "text-slate-500" : "text-muted-foreground")}>
              Luật Ngọc Sơn
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <section key={group.title}>
              <p
                className={cn(
                  "px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider",
                  isLightSurface ? "text-slate-400" : "text-muted-foreground",
                )}
              >
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = active === item.href || (item.href !== "/admin" && active.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                        isLightSurface && isActive ? "bg-slate-950 text-white shadow-sm" : null,
                        isLightSurface && !isActive ? "text-slate-500 hover:bg-slate-100 hover:text-slate-950" : null,
                        !isLightSurface && isActive ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950" : null,
                        !isLightSurface && !isActive ? "text-muted-foreground hover:bg-secondary hover:text-foreground" : null,
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {!isActive ? (
                        <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className={cn("border-t p-3", isLightSurface ? "border-slate-200" : "border-border")}>
          <div className={cn("rounded-lg border p-3", isLightSurface ? "border-slate-200 bg-slate-50" : "border-border bg-secondary/50")}>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                  isLightSurface ? "bg-slate-950 text-white" : "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
                )}
              >
                {(currentUser?.fullName ?? "?").charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{currentUser?.fullName ?? "Người dùng"}</p>
                <p className={cn("truncate text-[11px]", isLightSurface ? "text-slate-500" : "text-muted-foreground")}>
                  {ROLE_META[role].label}
                </p>
              </div>
            </div>
            <p className={cn("mt-2 line-clamp-2 text-[11px] leading-4", isLightSurface ? "text-slate-500" : "text-muted-foreground")}>
              {ROLE_META[role].description}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur lg:px-8",
            isLightSurface ? "border-slate-200 bg-white/90 text-slate-950" : "border-border bg-card/95",
          )}
        >
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                isLightSurface ? "bg-slate-950 text-white" : "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
              )}
            >
              <Scale className="size-4" />
            </span>
          </Link>

          <form action="/intake" method="get" className="relative hidden max-w-sm flex-1 sm:block">
            <Search
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2",
                isLightSurface ? "text-slate-400" : "text-muted-foreground",
              )}
            />
            <input
              name="q"
              suppressHydrationWarning
              placeholder="Tìm kiếm hồ sơ, khách hàng..."
              className={cn(
                "h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none transition-colors",
                isLightSurface
                  ? "border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                  : "border-input bg-secondary/70 placeholder:text-muted-foreground focus:border-ring focus:bg-background",
              )}
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span
              className={cn(
                "relative inline-flex size-9 items-center justify-center rounded-lg border",
                isLightSurface ? "border-slate-200 bg-white text-slate-500 shadow-sm" : "border-border bg-background text-muted-foreground",
              )}
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" />
            </span>
            <AccountMenu name={currentUser?.fullName ?? "Người dùng"} role={role} />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-5 lg:px-8 lg:py-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className={cn("text-xl font-semibold tracking-tight", isLightSurface ? "text-slate-950" : "text-slate-950 dark:text-slate-100")}>
                {title}
              </h1>
              {description ? (
                <p className={cn("mt-1 max-w-3xl text-sm", isLightSurface ? "text-slate-500" : "text-muted-foreground")}>
                  {description}
                </p>
              ) : null}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
