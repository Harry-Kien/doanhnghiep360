import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const display = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luật Ngọc Sơn — Khảo sát Pháp lý Doanh nghiệp 360°",
  description:
    "Chẩn đoán sức khỏe pháp lý doanh nghiệp trên 8 lĩnh vực: rà soát có hệ thống, luật sư phê duyệt từng kết luận, kết quả là báo cáo và lộ trình xử lý 30-90 ngày.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${sans.variable} ${display.variable}`}>
      <body className="m-0 font-sans">{children}</body>
    </html>
  );
}
