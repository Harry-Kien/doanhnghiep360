// Tối ưu ảnh thương hiệu: nén + resize + chuyển WebP. Chạy: node scripts/optimize-brand-images.mjs
import sharp from "sharp";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "brand");
const jobs = [
  { src: "emblem-360.png", out: "emblem-360.webp", w: 600 },
  { src: "offer-services.png", out: "offer-services.webp", w: 760 },
  { src: "poster-overview.png", out: "poster-overview.webp", w: 820 },
  { src: "standee-banner.png", out: "standee-banner.webp", w: 820 },
  { src: "offer-bonus.png", out: "offer-bonus.webp", w: 820 },
];

for (const j of jobs) {
  const info = await sharp(path.join(dir, j.src))
    .resize({ width: j.w, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(dir, j.out));
  console.log(`${j.out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)}KB`);
}
