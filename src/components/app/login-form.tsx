"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import type { Role } from "@/shared/roles";
import { targetForRole } from "@/shared/navigation";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  not_registered: "Email Google này chưa đăng ký khảo sát. Vui lòng đăng ký trước hoặc dùng email đã đăng ký.",
  google_unavailable: "Đăng nhập Google chưa được cấu hình. Vui lòng dùng mã OTP qua email.",
  google_state: "Phiên đăng nhập Google đã hết hạn. Vui lòng thử lại.",
  google_email: "Không lấy được email đã xác thực từ Google. Vui lòng thử lại.",
  google_failed: "Đăng nhập Google thất bại. Vui lòng thử lại hoặc dùng mã OTP.",
  customer_portal_required: "Cổng khách hàng chỉ dành cho tài khoản khách. Vui lòng đăng nhập bằng email khách hàng và mã OTP.",
};

export function LoginForm({
  next,
  googleEnabled,
  errorCode,
  variant = "customer",
}: {
  next?: string;
  googleEnabled?: boolean;
  errorCode?: string;
  variant?: "customer" | "staff";
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(errorCode ? OAUTH_ERROR_MESSAGES[errorCode] ?? null : null);
  const [otpStage, setOtpStage] = React.useState<"email" | "code">("email");
  const [otpChallenge, setOtpChallenge] = React.useState<string | null>(null);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpDevCode, setOtpDevCode] = React.useState<string | undefined>();
  const [otpInfo, setOtpInfo] = React.useState<string | null>(null);

  function go(role: Role) {
    window.location.assign(targetForRole(role, next));
  }

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      setError("Vui lòng nhập đúng email doanh nghiệp bạn đã dùng khi đăng ký khảo sát.");
      return;
    }
    setPending("otp-request");
    setError(null);
    setOtpInfo(null);
    try {
      const res = await fetch("/api/auth/otp-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Không gửi được mã.");
        return;
      }
      setOtpChallenge(json.data.challengeId ?? null);
      setOtpDevCode(json.data.devCode);
      setOtpStage("code");
      setOtpInfo(`Nếu email có tài khoản, mã xác thực 6 số đã được gửi tới ${email}.`);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(null);
    }
  }

  async function verifyOtpLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!otpChallenge) {
      setError("Mã không hợp lệ hoặc email chưa có tài khoản. Vui lòng kiểm tra lại email.");
      return;
    }
    setPending("otp-verify");
    setError(null);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: otpChallenge, code: otpCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Xác thực thất bại.");
        return;
      }
      if (json.data.loggedIn) go("customer");
      else setError("Tài khoản chưa được kích hoạt. Vui lòng liên hệ bộ phận tiếp nhận.");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending("login");
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Đăng nhập thất bại.");
        return;
      }
      go(json.data.role as Role);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(null);
    }
  }

  if (variant === "staff") {
    return (
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập nội bộ</h1>
        <p className="mt-2 text-sm text-muted-foreground">Khu vực dành cho nhân viên Luật Ngọc Sơn.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <Label className="mb-1.5 block">Email nhân viên</Label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="ten@legal360.vn" autoComplete="username" />
          </div>
          <div>
            <Label className="mb-1.5 block">Mật khẩu</Label>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" autoComplete="current-password" />
          </div>
          {error ? <FieldError message={error} /> : null}
          <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800" disabled={pending !== null}>
            {pending === "login" ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Đăng nhập
          </Button>
        </form>

      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Cổng khách hàng</h1>
      <p className="mt-2 text-sm text-muted-foreground">Đăng nhập để theo dõi hồ sơ khảo sát và nộp tài liệu.</p>

      <div className="mt-6">
        {otpStage === "email" ? (
          <form onSubmit={requestOtp} className="space-y-4" noValidate>
            {googleEnabled ? (
              <>
                <a
                  href="/api/auth/google"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <GoogleIcon className="size-4" />
                  Đăng nhập bằng Google
                </a>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> hoặc dùng mã OTP <span className="h-px flex-1 bg-border" />
                </div>
              </>
            ) : null}
            <div>
              <Label className="mb-1.5 block">Email doanh nghiệp</Label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="email@congty.vn" autoComplete="username" />
              <p className="mt-1.5 text-xs text-muted-foreground">Dùng email bạn đã đăng ký khảo sát. Hệ thống gửi mã xác thực 6 số để đăng nhập.</p>
            </div>
            {error ? <FieldError message={error} /> : null}
            <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800" disabled={pending !== null || !email}>
              {pending === "otp-request" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Gửi mã đăng nhập
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Chưa có hồ sơ khảo sát?{" "}
              <Link href="/dang-ky" className="font-medium text-primary hover:underline">
                Đăng ký tại đây
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtpLogin} className="space-y-4" noValidate>
            {otpInfo ? <p className="rounded-lg bg-accent/60 p-2.5 text-sm text-muted-foreground">{otpInfo}</p> : null}
            {otpDevCode ? (
              <p className="rounded-lg bg-amber-50 p-2.5 text-center text-sm text-amber-700">
                Mã kiểm thử local: <span className="font-mono font-semibold">{otpDevCode}</span>
              </p>
            ) : null}
            <Input
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="______"
              className="text-center text-2xl tracking-[0.5em]"
              invalid={!!error}
            />
            {error ? <FieldError message={error} /> : null}
            <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800" disabled={pending !== null || otpCode.length !== 6}>
              {pending === "otp-verify" ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Đăng nhập
            </Button>
            <button
              type="button"
              onClick={() => {
                setOtpStage("email");
                setOtpCode("");
                setError(null);
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Dùng email khác
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
