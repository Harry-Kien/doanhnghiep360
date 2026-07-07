// RBAC: vai trò người dùng và quyền truy cập (single source of truth).

export const ROLES = [
  "admin",
  "intake",
  "lawyer",
  "reviewer",
  "staff",
  "customer",
  "accountant",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  admin: { label: "Quản trị viên", description: "Toàn quyền hệ thống, user, template, settings" },
  intake: { label: "Intake / Sales", description: "Lead, conflict check, báo phí, hợp đồng, mở hồ sơ" },
  lawyer: { label: "Luật sư phụ trách", description: "Review hồ sơ được phân công, duyệt finding" },
  reviewer: { label: "Reviewer / Partner", description: "Duyệt cuối, yêu cầu chỉnh sửa, khóa version" },
  staff: { label: "Chuyên viên pháp lý", description: "Nhập liệu, khảo sát, biên bản, phân loại" },
  customer: { label: "Khách hàng doanh nghiệp", description: "Hồ sơ của mình: upload, nhận báo cáo" },
  accountant: { label: "Kế toán", description: "Hợp đồng, phí, thanh toán, hóa đơn" },
};

/** Các role nội bộ (không phải khách hàng). */
export const INTERNAL_ROLES: Role[] = ["admin", "intake", "lawyer", "reviewer", "staff", "accountant"];

/** Quyền xem toàn bộ hồ sơ (không bị giới hạn theo org). */
export function canViewAllCases(role: Role): boolean {
  return role === "admin" || role === "intake" || role === "reviewer";
}

/** Quyền truy cập một section (dùng để dựng menu/route guard). */
export type AppSection = "admin" | "intake" | "lawyer" | "portal" | "accounting";

export const SECTION_ROLES: Record<AppSection, Role[]> = {
  admin: ["admin"],
  intake: ["admin", "intake"],
  lawyer: ["admin", "lawyer", "reviewer", "staff"],
  portal: ["customer"],
  accounting: ["admin", "accountant"],
};

export function canAccessSection(role: Role, section: AppSection): boolean {
  return SECTION_ROLES[section].includes(role);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
