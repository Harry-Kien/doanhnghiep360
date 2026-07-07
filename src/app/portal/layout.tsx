import Link from "next/link";
import { Scale } from "lucide-react";
import { AccountMenu } from "@/components/app/account-menu";
import { requireCustomerPortal } from "@/lib/guard";
import { getCurrentUserPublic } from "@/lib/session";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = requireCustomerPortal("/portal");
  const user = getCurrentUserPublic();
  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="size-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[16px] font-semibold tracking-tight text-[#0B1B33]">Luật Ngọc Sơn</span>
              <span className="text-[11px] text-muted-foreground">Cổng khách hàng</span>
            </span>
          </Link>
          <AccountMenu name={user?.fullName ?? "Khách hàng"} role={viewer.role} />
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
