import Link from "next/link";
import Image from "next/image";
import { Phone, Globe, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/emblem-360.webp" alt="Ngọc Sơn & Partners" width={40} height={40} className="size-10 rounded-full object-cover ring-1 ring-border" />
            <div className="leading-tight">
              <p className="font-display text-base font-semibold text-[#0B1B33]">Công ty Luật TNHH Ngọc Sơn &amp; Partners</p>
              <p className="text-xs text-muted-foreground">Chi nhánh Dĩ An · Khảo sát Pháp lý Doanh nghiệp 360°</p>
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Ứng dụng công nghệ rà soát pháp lý hiện đại kết hợp đội ngũ luật sư phê duyệt cuối — giúp doanh
            nghiệp nhận diện và xử lý rủi ro pháp lý toàn diện kèm báo cáo và roadmap 30-90 ngày.
          </p>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <a href="tel:0972290595" className="flex items-center gap-2 hover:text-foreground"><Phone className="size-4 text-gold" /> 097 2290 595</a>
            <a href="https://luatngocson.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground"><Globe className="size-4 text-gold" /> luatngocson.com</a>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-gold" /> Dĩ An, Bình Dương</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Dịch vụ</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="#quy-trinh" className="hover:text-foreground">Quy trình</a></li>
            <li><a href="#pham-vi" className="hover:text-foreground">Phạm vi khảo sát</a></li>
            <li><a href="#uu-dai" className="hover:text-foreground">Ưu đãi trọn gói</a></li>
            <li><Link href="/dang-ky" className="hover:text-foreground">Đăng ký khảo sát</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Vận hành</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">Đăng nhập hệ thống</Link></li>
            <li><Link href="/admin" className="hover:text-foreground">Admin dashboard</Link></li>
            <li><Link href="/lawyer" className="hover:text-foreground">Lawyer review</Link></li>
            <li><Link href="/portal" className="hover:text-foreground">Cổng khách hàng</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground md:flex-row">
          <p>© 2026 Công ty Luật TNHH Ngọc Sơn &amp; Partners. Bảo lưu mọi quyền.</p>
          <p>Công nghệ hỗ trợ rà soát — mọi kết luận pháp lý do luật sư phê duyệt cuối.</p>
        </div>
      </div>
    </footer>
  );
}
