import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge middleware: chặn nhanh người dùng chưa đăng nhập khỏi khu vực bảo vệ.
// Chỉ kiểm tra cookie tồn tại (không verify chữ ký ở edge); requireAuth ở server verify đầy đủ.
const SESSION_COOKIE = "legal360_session";

// Khu vực nội bộ ⇒ trang đăng nhập nhân viên riêng; khu vực khách ⇒ cổng khách hàng.
const STAFF_PREFIXES = ["/admin", "/intake", "/lawyer", "/cases", "/ke-toan"];

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const path = req.nextUrl.pathname;
    const isStaffArea = STAFF_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
    const url = req.nextUrl.clone();
    url.pathname = isStaffArea ? "/nhan-vien" : "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/intake/:path*", "/lawyer/:path*", "/portal/:path*", "/cases/:path*", "/ke-toan/:path*"],
};
