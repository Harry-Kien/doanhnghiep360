import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Quote } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PACKAGE_META, SERVICE_PACKAGES, SURVEY_SCOPE, VND } from "@/shared/constants";

// ───────────────────────── Dữ liệu nội dung ─────────────────────────
const HERO_FLOW = [
  { t: "Đăng ký khảo sát", d: "Doanh nghiệp để lại thông tin cơ bản và mục tiêu cần rà soát." },
  { t: "Legal360 tiếp nhận", d: "Bộ phận phụ trách kiểm tra nhu cầu, phạm vi và xung đột lợi ích." },
  { t: "Gửi checklist tài liệu", d: "Khách hàng nhận danh mục giấy tờ cần chuẩn bị theo từng nhóm pháp lý." },
  { t: "Luật sư rà soát", d: "Sau khi đủ dữ liệu, luật sư mới lập báo cáo và lộ trình xử lý." },
];

const STEPS = [
  { t: "Đăng ký & xác thực", d: "Gửi phiếu yêu cầu khảo sát, xác thực email — mở hồ sơ ban đầu." },
  { t: "Conflict check & hợp đồng", d: "Kiểm tra xung đột lợi ích, báo phí và ký hợp đồng dịch vụ pháp lý." },
  { t: "Mở hồ sơ & nộp tài liệu", d: "Sinh mã hồ sơ riêng, lập kho tài liệu chuẩn để doanh nghiệp tải lên." },
  { t: "Rà soát có hệ thống", d: "Đọc, phân loại và đối chiếu tài liệu trên 8 lĩnh vực pháp lý." },
  { t: "Luật sư phê duyệt", d: "Luật sư kiểm tra từng phát hiện, bổ sung căn cứ và duyệt kết luận." },
  { t: "Báo cáo & lộ trình", d: "Bàn giao báo cáo, bản đồ rủi ro và lộ trình xử lý 30-90 ngày." },
];

const DELIVERABLES = [
  { t: "Báo cáo khảo sát", d: "Bản PDF/DOCX có cấu trúc, đánh giá pháp lý từng vấn đề, có phiên bản và bản final khóa lại." },
  { t: "Bản đồ rủi ro", d: "Tổng điểm sức khỏe pháp lý và mức độ rủi ro theo từng nhóm — thấy ngay đâu cần xử lý trước." },
  { t: "Checklist xử lý", d: "Danh sách việc cần làm, mức ưu tiên và bộ phận phụ trách, không bỏ sót." },
  { t: "Lộ trình 30-90 ngày", d: "Kế hoạch khắc phục theo từng mốc thời gian, gắn với từng phát hiện đã duyệt." },
];

const DIFF = [
  { t: "Luật sư duyệt cuối", d: "Công nghệ chỉ rà soát và lập bản nháp. Mọi kết luận pháp lý bắt buộc qua luật sư phụ trách phê duyệt — không có ngoại lệ." },
  { t: "Mỗi phát hiện có chứng cứ", d: "Không đưa nhận định vào báo cáo nếu thiếu bằng chứng từ tài liệu. Rủi ro nào cũng truy được về nguồn." },
  { t: "Hồ sơ minh bạch", d: "Mã hồ sơ riêng, kho tài liệu theo cấu trúc, nhật ký mọi thao tác và phiên bản báo cáo — bài bản như một firm." },
];

const FAQS = [
  { q: "Công nghệ có thay luật sư không?", a: "Không. Hệ thống chỉ hỗ trợ số hóa, phân loại tài liệu và lập bản nháp rà soát. Mọi phát hiện rủi ro và báo cáo cuối cùng đều do luật sư phụ trách kiểm tra, bổ sung căn cứ pháp luật và phê duyệt." },
  { q: "Tài liệu của doanh nghiệp có được bảo mật không?", a: "Có. Tài liệu lưu theo mã hồ sơ riêng, phân quyền truy cập theo vai trò, ghi nhật ký mọi thao tác. Khách hàng chỉ xem được hồ sơ của chính mình." },
  { q: "Mất bao lâu để có báo cáo?", a: "Thông thường 7-15 ngày làm việc, tùy phạm vi khảo sát và mức độ đầy đủ của tài liệu. Doanh nghiệp theo dõi tiến độ theo thời gian thực trên cổng khách hàng." },
  { q: "Doanh nghiệp cần chuẩn bị gì?", a: "Sau khi ký hợp đồng, doanh nghiệp nhận checklist tài liệu (giấy phép, điều lệ, hợp đồng lao động, hồ sơ thuế, hợp đồng thương mại…) và tải trực tiếp lên cổng. Hệ thống hiển thị rõ tài liệu nào còn thiếu." },
];

const SCOPE_NOTE: Record<string, string> = {
  corporate: "Điều lệ, cổ đông/thành viên, giấy phép ngành nghề, quản trị",
  labor: "Hợp đồng lao động, nội quy, BHXH, tranh chấp lao động",
  tax: "Tuân thủ thuế, rủi ro hóa đơn, báo cáo tài chính",
  commercial: "Điều khoản, nghĩa vụ, phạt vi phạm trong hợp đồng",
  investment: "Cấu trúc đầu tư, điều kiện, giấy phép M&A",
  ip: "Nhãn hiệu, bản quyền, dữ liệu cá nhân, tên miền",
  dispute: "Vụ việc tiềm ẩn và nghĩa vụ tố tụng",
  management: "Quy chế nội bộ, tuân thủ, kiểm soát rủi ro",
};

export default function LandingPage() {
  return (
    <>
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-[#0B1B33] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "26px 26px" }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-[#1E5BD6]/20 blur-3xl" />
        <div className="container relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-gold">
              <span className="h-px w-8 bg-gold/60" />
              Luật Ngọc Sơn
            </p>
            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.08] tracking-tight md:text-6xl">
              Chẩn đoán <span className="italic text-gold">sức khỏe pháp lý</span><br className="hidden md:block" /> cho doanh nghiệp của bạn
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Rà soát có hệ thống trên 8 lĩnh vực, luật sư phê duyệt từng kết luận. Kết quả không phải lời khuyên chung chung,
              mà là <span className="text-white">bản đồ rủi ro và lộ trình xử lý 30-90 ngày</span> cho riêng doanh nghiệp.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/dang-ky" className={cn(buttonVariants({ size: "lg" }), "bg-gold text-gold-foreground hover:bg-gold/90")}>
                Đăng ký khảo sát <ArrowRight className="size-4" />
              </Link>
              <a href="#ket-qua" className="text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline">
                Xem doanh nghiệp nhận được gì →
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-2 border-t border-white/10 pt-6 text-sm text-white/60">
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-gold" /> 8 lĩnh vực pháp lý</li>
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-gold" /> Luật sư duyệt cuối</li>
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-gold" /> Roadmap 30-90 ngày</li>
            </ul>
          </div>

          {/* Điểm bắt đầu của khách hàng mới */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-white/10 bg-white p-6 text-[#0B1B33] shadow-2xl">
              <div className="border-b border-slate-200 pb-5">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Bắt đầu khảo sát</p>
                <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">
                  Tạo yêu cầu trước, có hồ sơ sau
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Khách hàng lần đầu chỉ cần đăng ký nhu cầu. Mã hồ sơ, checklist và báo cáo chỉ xuất hiện sau khi Legal360 tiếp nhận và mở quy trình.
                </p>
              </div>
              <ol className="mt-5 space-y-4">
                {HERO_FLOW.map((item, index) => (
                  <li key={item.t} className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-semibold text-gold">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{item.t}</span>
                      <span className="mt-0.5 block text-sm leading-6 text-slate-500">{item.d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Link href="/dang-ky" className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full bg-gold text-gold-foreground hover:bg-gold/90")}>
                Bắt đầu đăng ký khảo sát <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── QUY TRÌNH (timeline đánh số) ───────── */}
      <section id="quy-trinh" className="border-b border-border py-20 md:py-28">
        <div className="container">
          <Eyebrow>Quy trình</Eyebrow>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Sáu bước, từ phiếu đăng ký đến lộ trình xử lý
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.t} className="border-t border-border pt-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl font-semibold text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-base font-semibold">{s.t}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── PHẠM VI (mục lục kiểu báo cáo) ───────── */}
      <section id="pham-vi" className="bg-secondary/40 py-20 md:py-28">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Eyebrow>Phạm vi khảo sát</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Tám lĩnh vực được rà soát toàn diện
              </h2>
              <p className="mt-4 text-muted-foreground">
                Mỗi lĩnh vực là một phần trong báo cáo, có đánh giá riêng và mức độ rủi ro riêng — như mục lục của một hồ sơ pháp lý.
              </p>
            </div>
            <div className="lg:col-span-8">
              <ol className="grid gap-x-10 sm:grid-cols-2">
                {SURVEY_SCOPE.map((s, i) => (
                  <li key={s.key} className="flex items-start gap-4 border-b border-border py-4">
                    <span className="font-mono text-sm text-muted-foreground/60">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{SCOPE_NOTE[s.key]}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── KẾT QUẢ ───────── */}
      <section id="ket-qua" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl">
            <Eyebrow>Kết quả</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Doanh nghiệp nhận về bốn thứ cụ thể
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
            {DELIVERABLES.map((d, i) => (
              <div key={d.t} className="bg-card p-7">
                <span className="font-display text-xl font-semibold text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-lg font-semibold">{d.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── GÓI PRO NỔI BẬT ───────── */}
      <section id="uu-dai" className="bg-[#0B1B33] text-white">
        <div className="container grid items-center gap-12 py-20 md:grid-cols-2 md:py-24">
          <div>
            <Eyebrow light>Gói nổi bật</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Gói Pro <span className="text-gold">12.000.000đ</span> cho doanh nghiệp cần rà soát mở rộng
            </h2>
            <p className="mt-4 max-w-xl text-white/70">
              Phù hợp với doanh nghiệp muốn rà soát phần pháp lý nền tảng, lao động, thuế và hợp đồng thương mại trong cùng một hồ sơ.
            </p>
            <ul className="mt-7 space-y-3">
              {["Khảo sát pháp luật doanh nghiệp", "Khảo sát pháp luật lao động", "Khảo sát pháp luật thương mại"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[15px]"><Check className="size-5 shrink-0 text-gold" /> {t}</li>
              ))}
            </ul>
            <div className="mt-7 rounded-xl border border-white/15 bg-white/[0.05] p-5">
              <p className="text-sm font-semibold text-gold">Ưu đãi kèm theo</p>
              <ul className="mt-3 space-y-2 text-sm text-white/85">
                {["Gói thủ tục đăng ký thay đổi thông tin doanh nghiệp", "2 giờ training pháp lý", "Bộ tài liệu quản trị doanh nghiệp nội bộ"].map((t) => (
                  <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-gold" /> {t}</li>
                ))}
              </ul>
            </div>
            <Link href="/dang-ky" className={cn(buttonVariants({ size: "lg" }), "mt-8 bg-gold text-gold-foreground hover:bg-gold/90")}>
              Đăng ký gói Pro <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-7 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Pro bao gồm</p>
            <div className="mt-5 grid gap-4">
              {["Toàn bộ gói Basic", "Thuế / kế toán, BHXH", "Hợp đồng thương mại", "Checklist xử lý rủi ro"].map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <span className="font-mono text-sm text-gold">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-sm text-white/85">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-white/60">
              Bảng giá bên dưới là mức đăng ký chính thức. Ưu đãi phát sinh sẽ được xác nhận riêng trong báo giá hoặc hợp đồng dịch vụ.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── KHÁC BIỆT ───────── */}
      <section id="khac-biet" className="py-20 md:py-28">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Quote className="size-8 text-gold" />
              <h2 className="mt-4 font-display text-3xl font-semibold leading-snug tracking-tight md:text-4xl">
                Công nghệ tăng tốc, luật sư đảm bảo chất lượng
              </h2>
            </div>
            <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
              {DIFF.map((d) => (
                <div key={d.t}>
                  <div className="h-px w-10 bg-gold" />
                  <h3 className="mt-4 text-base font-semibold">{d.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── BẢNG GIÁ ───────── */}
      <section id="bang-gia" className="bg-secondary/40 py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl">
            <Eyebrow>Gói dịch vụ</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Chọn phạm vi phù hợp</h2>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-4">
            {SERVICE_PACKAGES.map((key) => {
              const p = PACKAGE_META[key];
              return (
                <div key={key} className={cn("flex flex-col rounded-xl border bg-card p-6", p.highlight ? "border-gold ring-1 ring-gold" : "border-border")}>
                  {p.highlight ? <span className="mb-3 w-fit rounded-full bg-gold/12 px-2.5 py-0.5 text-xs font-semibold text-gold">Phổ biến</span> : null}
                  <h3 className="font-display text-lg font-semibold">{p.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <p className="mt-4 text-2xl font-semibold">{p.price > 0 ? VND.format(p.price) : "Liên hệ"}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0 text-gold" /> {f}</li>
                    ))}
                  </ul>
                  <Link href="/dang-ky" className={cn(buttonVariants({ variant: p.highlight ? "default" : "outline" }), "mt-6", p.highlight && "bg-gold text-gold-foreground hover:bg-gold/90")}>
                    Đăng ký gói {p.label}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── ĐỘI NGŨ ───────── */}
      <section id="doi-ngu" className="py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Đội ngũ</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Đội ngũ luật sư đứng sau mỗi báo cáo
            </h2>
            <p className="mt-4 text-muted-foreground">
              Dịch vụ Khảo sát Doanh nghiệp 360° được thực hiện và phê duyệt bởi đội ngũ luật sư của Luật Ngọc Sơn —
              mỗi kết luận pháp lý đều có người chịu trách nhiệm.
            </p>
          </div>
          <figure className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-[#eaf2fb] shadow-sm ring-1 ring-black/5">
            <Image
              src="/brand/team-360.webp"
              alt="Đội ngũ luật sư Luật Ngọc Sơn — Khảo sát Pháp lý Doanh nghiệp 360°"
              width={1600}
              height={931}
              className="h-auto w-full"
            />
          </figure>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Đội ngũ Luật sư — Luật Ngọc Sơn
          </p>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="bg-secondary/40 py-20 md:py-28">
        <div className="container grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>Hỏi &amp; đáp</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Câu hỏi thường gặp</h2>
          </div>
          <div className="lg:col-span-8">
            {FAQS.map((f) => (
              <details key={f.q} className="group border-b border-border py-5 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between gap-4 font-display text-lg font-medium">
                  {f.q}
                  <span className="text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="bg-[#0B1B33] text-white">
        <div className="container flex flex-col items-center gap-7 py-20 text-center md:py-24">
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            Bắt đầu chẩn đoán sức khỏe pháp lý doanh nghiệp
          </h2>
          <p className="max-w-xl text-white/70">
            Đăng ký trong vài phút. Đội ngũ luật sư Luật Ngọc Sơn đồng hành từ tiếp nhận đến báo cáo và lộ trình xử lý.
          </p>
          <Link href="/dang-ky" className={cn(buttonVariants({ size: "lg" }), "bg-gold text-gold-foreground hover:bg-gold/90")}>
            Đăng ký khảo sát ngay <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={cn("flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]", light ? "text-gold" : "text-gold")}>
      <span className="h-px w-8 bg-gold/60" />
      {children}
    </p>
  );
}
