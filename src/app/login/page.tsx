import { LoginForm } from "@/components/app/login-form";
import { AuthScreen } from "@/components/app/auth-screen";
import { isGoogleOAuthConfigured } from "@/lib/env";

export const metadata = { title: "Cổng khách hàng — Luật Ngọc Sơn" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const googleEnabled = isGoogleOAuthConfigured();
  return (
    <AuthScreen>
      <LoginForm variant="customer" next={searchParams.next} googleEnabled={googleEnabled} errorCode={searchParams.error} />
    </AuthScreen>
  );
}
