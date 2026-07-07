import { redirect } from "next/navigation";
import { canAccessSection, type AppSection } from "@/shared/roles";
import { getViewer } from "@/lib/session";
import type { Viewer } from "@/server/services/cases";

// Khu nội bộ ⇒ trang đăng nhập nhân viên; khu khách ⇒ cổng khách hàng.
const STAFF_PREFIXES = ["/admin", "/intake", "/lawyer", "/cases", "/ke-toan"];

function loginPathFor(returnTo?: string): string {
  if (returnTo && STAFF_PREFIXES.some((p) => returnTo === p || returnTo.startsWith(`${p}/`))) {
    return "/nhan-vien";
  }
  return "/login";
}

/** Bắt buộc đăng nhập (server component). Chưa đăng nhập ⇒ về trang đăng nhập phù hợp. */
export function requireAuth(returnTo?: string): Viewer {
  const viewer = getViewer();
  if (!viewer) {
    const base = loginPathFor(returnTo);
    redirect(returnTo ? `${base}?next=${encodeURIComponent(returnTo)}` : base);
  }
  return viewer;
}

/** Bắt buộc đăng nhập + đúng quyền section. */
export function requireSection(section: AppSection): Viewer {
  const viewer = getViewer();
  if (!viewer) redirect(section === "portal" ? "/login" : "/nhan-vien");
  if (!canAccessSection(viewer.role, section)) {
    redirect(viewer.role === "customer" ? "/portal" : "/nhan-vien");
  }
  return viewer;
}

/** Cổng khách hàng là vùng tách riêng: tài khoản nội bộ không tự nhảy vào admin tại đây. */
export function requireCustomerPortal(returnTo = "/portal"): Viewer {
  const viewer = getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (viewer.role !== "customer") {
    redirect(`/login?next=${encodeURIComponent(returnTo)}&error=customer_portal_required`);
  }
  return viewer;
}
