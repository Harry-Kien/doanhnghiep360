import { AppShell } from "@/components/app/app-shell";
import { UserAdmin } from "@/components/app/user-admin";
import { requireSection } from "@/lib/guard";
import { listStaffUsers } from "@/server/services/users";

export const metadata = { title: "Quản lý người dùng — Legal360" };

export default function AdminUsersPage() {
  const viewer = requireSection("admin");
  const users = listStaffUsers();
  return (
    <AppShell
      role={viewer.role}
      active="/admin/users"
      surface="light"
      title="Quản lý người dùng"
      description="Cấp tài khoản cho nhân sự theo vai trò, khóa/mở và đặt lại mật khẩu. Chỉ admin truy cập."
    >
      <UserAdmin initialUsers={users} currentUserId={viewer.id} />
    </AppShell>
  );
}
