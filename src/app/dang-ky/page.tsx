import Link from "next/link";
import { Scale, Check, ShieldCheck, FileCheck2, Hash, ArrowLeft } from "lucide-react";
import { IntakeForm } from "@/components/intake/intake-form";

export const metadata = { title: "Đăng ký khảo sát — Legal360" };

const BENEFITS = [
  { icon: Hash, text: "Mã hồ sơ riêng & kho tài liệu chuẩn hóa cho từng doanh nghiệp" },
  { icon: ShieldCheck, text: "Bảo mật thông tin, phân quyền truy cập theo quy trình công ty luật" },
  { icon: FileCheck2, text: "Công nghệ rà soát hiện đại, luật sư phê duyệt từng kết luận" },
  { icon: Check, text: "Báo cáo PDF/DOCX, dashboard rủi ro & roadmap xử lý 30-90 ngày" },
];

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,460px)_1fr]">
      {/* Branded panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Scale className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Ngọc Sơn &amp; Partners</span>
          </Link>
          <h2 className="mt-12 font-display text-3xl font-semibold leading-tight tracking-tight">
            Khảo sát Pháp lý<br />Doanh nghiệp <span className="italic text-gold">360°</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            Đăng ký để được rà soát toàn diện rủi ro pháp lý — kết hợp công nghệ hiện đại và đội ngũ luật sư phê duyệt cuối.
          </p>

          <ul className="mt-10 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/12">
                  <b.icon className="size-4" />
                </span>
                <span className="text-sm leading-relaxed text-primary-foreground/90">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 rounded-xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur">
          <p className="text-sm font-medium">Cam kết bảo mật</p>
          <p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">
            Thông tin và tài liệu doanh nghiệp được lưu trữ theo mã hồ sơ riêng, ghi nhật ký truy cập (audit log) và chỉ phục vụ mục đích khảo sát pháp lý.
          </p>
        </div>
      </aside>

      {/* Form */}
      <div className="flex flex-col bg-secondary/30">
        <header className="flex items-center justify-between border-b border-border bg-background px-5 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="size-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">Ngọc Sơn &amp; Partners</span>
          </Link>
          <Link href="/" className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Về trang chủ
          </Link>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <div className="mx-auto max-w-2xl">
            <div className="mb-7">
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Phiếu yêu cầu khảo sát pháp lý 360°</h1>
              <p className="mt-2 text-muted-foreground">
                Điền thông tin doanh nghiệp và nhu cầu khảo sát — chỉ mất vài phút. Bộ phận tiếp nhận sẽ liên hệ xác nhận và gửi báo phí.
              </p>
            </div>
            <IntakeForm />
          </div>
        </main>
      </div>
    </div>
  );
}
