import Link from "next/link";
import Image from "next/image";
import { Phone, Globe } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#quy-trinh", label: "Quy trình" },
  { href: "#pham-vi", label: "Phạm vi" },
  { href: "#bang-gia", label: "Gói dịch vụ" },
  { href: "#doi-ngu", label: "Đội ngũ" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <div className="sticky top-0 z-40">
      {/* Top contact bar */}
      <div className="hidden bg-[#0B1B33] text-white md:block">
        <div className="container flex h-9 items-center justify-between text-xs">
          <span className="font-medium">LUẬT NGỌC SƠN — CN Dĩ An</span>
          <div className="flex items-center gap-5">
            <a href="tel:0972290595" className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
              <Phone className="size-3.5 text-gold" /> 097 2290 595
            </a>
            <a href="https://luatngocson.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
              <Globe className="size-3.5 text-gold" /> luatngocson.com
            </a>
          </div>
        </div>
      </div>

      <header className="border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/brand/emblem-360.webp" alt="Luật Ngọc Sơn" width={40} height={40} className="size-10 rounded-full object-cover ring-1 ring-border" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[16px] font-semibold tracking-tight text-[#0B1B33]">Luật Ngọc Sơn</span>
              <span className="text-[11px] text-muted-foreground">Khảo sát Pháp lý Doanh nghiệp 360°</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
              Đăng nhập
            </Link>
            <Link href="/dang-ky" className={cn(buttonVariants({ size: "sm" }), "bg-gold text-gold-foreground hover:bg-gold/90")}>
              Đăng ký khảo sát
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
