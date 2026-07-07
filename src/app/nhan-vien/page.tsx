import { LoginForm } from "@/components/app/login-form";
import { AuthScreen } from "@/components/app/auth-screen";

export const metadata = { title: "Đăng nhập nội bộ — Ngọc Sơn & Partners" };

// Trang đăng nhập riêng cho NHÂN VIÊN (không link công khai từ landing/khách hàng).
export default function StaffLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <AuthScreen>
      <LoginForm variant="staff" next={searchParams.next} />
    </AuthScreen>
  );
}
