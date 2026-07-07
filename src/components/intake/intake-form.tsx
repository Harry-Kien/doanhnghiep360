"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { surveyRequestSchema, type SurveyRequestInput } from "@/shared/schemas";
import { SURVEY_SCOPE, BUSINESS_TYPES } from "@/shared/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Textarea, Label, Select, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = ["Doanh nghiệp", "Phạm vi khảo sát", "Liên hệ & xác nhận"] as const;

const STEP_FIELDS: Array<Array<keyof SurveyRequestInput>> = [
  ["companyName", "taxCode", "businessType", "industry", "headcount", "address", "market"],
  ["scope", "objectives", "specialRequests", "preferredMode", "preferredTime"],
  ["contactName", "contactPosition", "email", "phone", "legalRepName", "legalRepPosition", "note", "consent"],
];

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "otp"; challengeId: string; email: string; devCode?: string; duplicateWarning: boolean }
  | { status: "success"; duplicateWarning: boolean }
  | { status: "error"; message: string };

export function IntakeForm() {
  const [step, setStep] = React.useState(0);
  const [submit, setSubmit] = React.useState<SubmitState>({ status: "idle" });
  const [otpCode, setOtpCode] = React.useState("");
  const [otpPending, setOtpPending] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  const form = useForm<SurveyRequestInput>({
    resolver: zodResolver(surveyRequestSchema),
    mode: "onTouched",
    defaultValues: {
      companyName: "",
      taxCode: "",
      scope: [],
      preferredMode: "either",
      contactName: "",
      email: "",
      phone: "",
      // consent intentionally undefined -> bắt buộc tick
    } as Partial<SurveyRequestInput> as SurveyRequestInput,
  });

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const scope = watch("scope") ?? [];

  function toggleScope(key: string) {
    const next = scope.includes(key) ? scope.filter((s) => s !== key) : [...scope, key];
    setValue("scope", next, { shouldValidate: true, shouldTouch: true });
  }

  async function next() {
    const valid = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmit(values: SurveyRequestInput) {
    setSubmit({ status: "submitting" });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setSubmit({ status: "error", message: json?.error?.message ?? "Gửi phiếu thất bại." });
        return;
      }
      const d = json.data ?? {};
      const dup = Boolean(d.duplicateWarning);
      if (d.otpSent && d.challengeId) {
        setSubmit({ status: "otp", challengeId: d.challengeId, email: values.email, devCode: d.devCode, duplicateWarning: dup });
      } else {
        // Không gửi được OTP (vd lỗi email) — vẫn tiếp nhận lead.
        setSubmit({ status: "success", duplicateWarning: dup });
      }
    } catch {
      setSubmit({ status: "error", message: "Không thể kết nối máy chủ. Vui lòng thử lại." });
    }
  }

  async function verifyOtp() {
    if (submit.status !== "otp") return;
    setOtpPending(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: submit.challengeId, code: otpCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setOtpError(json?.error?.message ?? "Xác thực thất bại.");
        return;
      }
      setSubmit({ status: "success", duplicateWarning: submit.duplicateWarning });
    } catch {
      setOtpError("Không thể kết nối máy chủ.");
    } finally {
      setOtpPending(false);
    }
  }

  if (submit.status === "otp") {
    return (
      <Card className="mx-auto max-w-md p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          <ShieldCheck className="size-7" />
        </span>
        <h2 className="mt-5 text-center text-xl font-semibold">Xác thực email</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Mã xác thực gồm 6 chữ số đã được gửi tới <span className="font-medium text-foreground">{submit.email}</span>. Nhập mã để hoàn tất gửi phiếu.
        </p>
        {submit.devCode ? (
          <p className="mt-3 rounded-md bg-amber-50 p-2.5 text-center text-sm text-amber-700">
            Mã kiểm thử local: <span className="font-mono font-semibold">{submit.devCode}</span>
          </p>
        ) : null}
        <Input
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="______"
          className="mt-5 text-center text-2xl tracking-[0.5em]"
          invalid={!!otpError}
        />
        <FieldError message={otpError ?? undefined} />
        <Button className="mt-4 w-full" onClick={verifyOtp} disabled={otpPending || otpCode.length !== 6}>
          {otpPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Xác nhận & gửi phiếu
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Mã hết hạn sau 10 phút.</p>
      </Card>
    );
  }

  if (submit.status === "success") {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Đã tiếp nhận phiếu yêu cầu khảo sát</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cảm ơn bạn. Email đã được xác thực và <span className="font-medium text-foreground">tài khoản cổng khách hàng của bạn đã được kích hoạt</span> —
          bạn có thể vào cổng để theo dõi tiến trình hồ sơ và nộp tài liệu. Bộ phận tiếp nhận sẽ thực hiện
          conflict check và liên hệ gửi báo phí, hợp đồng trong thời gian sớm nhất.
        </p>
        {submit.duplicateWarning ? (
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
            Lưu ý: hệ thống ghi nhận doanh nghiệp này có thể đã có hồ sơ đang xử lý. Bộ phận tiếp nhận sẽ rà soát để tránh trùng lặp.
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>Về trang chủ</Link>
          <Link href="/portal" className={buttonVariants({})}>Vào cổng khách hàng</Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl p-6 md:p-8">
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i < step && "bg-emerald-500 text-white",
                i === step && "bg-primary text-primary-foreground",
                i > step && "bg-secondary text-muted-foreground",
              )}
            >
              {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
            </span>
            <span className={cn("hidden text-sm font-medium sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="mx-1 hidden h-px flex-1 bg-border sm:block" /> : null}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Tên doanh nghiệp" required error={errors.companyName?.message}>
              <Input {...register("companyName")} invalid={!!errors.companyName} placeholder="CÔNG TY CỔ PHẦN ..." />
            </Field>
            <Field label="Mã số thuế" error={errors.taxCode?.message}>
              <Input {...register("taxCode")} invalid={!!errors.taxCode} placeholder="0312345678" />
            </Field>
            <Field label="Loại hình doanh nghiệp" error={errors.businessType?.message}>
              <Select {...register("businessType")} defaultValue="">
                <option value="" disabled>— Chọn loại hình —</option>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
            </Field>
            <Field label="Ngành nghề chính" error={errors.industry?.message}>
              <Input {...register("industry")} placeholder="VD: Sản xuất, CNTT, Bán lẻ..." />
            </Field>
            <Field label="Số lượng lao động" error={errors.headcount?.message}>
              <Input type="number" min={0} {...register("headcount")} placeholder="VD: 50" />
            </Field>
            <Field className="sm:col-span-2" label="Địa chỉ trụ sở" error={errors.address?.message}>
              <Input {...register("address")} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
            </Field>
            <Field label="Thị trường hoạt động" error={errors.market?.message}>
              <Input {...register("market")} placeholder="VD: Việt Nam, xuất khẩu..." />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <Label>
                Phạm vi khảo sát <span className="text-red-500">*</span>
              </Label>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">Chọn các nhóm pháp lý cần khảo sát.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SURVEY_SCOPE.map((s) => {
                  const checked = scope.includes(s.key);
                  return (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => toggleScope(s.key)}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                        checked ? "border-primary bg-accent/60" : "border-border hover:bg-secondary/60",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                        )}
                      >
                        {checked ? <CheckCircle2 className="size-3.5" /> : null}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{s.label}</span>
                        <span className="block text-xs text-muted-foreground">{s.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <FieldError message={errors.scope?.message as string | undefined} />
            </div>

            <Field label="Mục tiêu khảo sát" error={errors.objectives?.message}>
              <Textarea {...register("objectives")} placeholder="VD: Rà soát tổng thể rủi ro pháp lý trước khi gọi vốn..." />
            </Field>
            <Field label="Yêu cầu đặc biệt" error={errors.specialRequests?.message}>
              <Textarea {...register("specialRequests")} placeholder="Nếu có yêu cầu riêng về phạm vi, thời gian, bảo mật..." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hình thức khảo sát" error={errors.preferredMode?.message}>
                <Select {...register("preferredMode")}>
                  <option value="either">Linh hoạt</option>
                  <option value="online">Online</option>
                  <option value="offline">Trực tiếp tại doanh nghiệp</option>
                </Select>
              </Field>
              <Field label="Thời gian mong muốn" error={errors.preferredTime?.message}>
                <Input {...register("preferredTime")} placeholder="VD: Tuần đầu tháng 7/2026" />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ tên người liên hệ" required error={errors.contactName?.message}>
              <Input {...register("contactName")} invalid={!!errors.contactName} placeholder="Nguyễn Văn A" />
            </Field>
            <Field label="Chức vụ người liên hệ" error={errors.contactPosition?.message}>
              <Input {...register("contactPosition")} placeholder="VD: Trưởng phòng pháp chế" />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <Input type="email" {...register("email")} invalid={!!errors.email} placeholder="email@congty.vn" />
            </Field>
            <Field label="Số điện thoại" required error={errors.phone?.message}>
              <Input {...register("phone")} invalid={!!errors.phone} placeholder="0903xxxxxx" />
            </Field>
            <Field label="Người đại diện pháp luật" error={errors.legalRepName?.message}>
              <Input {...register("legalRepName")} placeholder="Họ tên người đại diện" />
            </Field>
            <Field label="Chức vụ người đại diện" error={errors.legalRepPosition?.message}>
              <Input {...register("legalRepPosition")} placeholder="VD: Tổng giám đốc" />
            </Field>
            <Field className="sm:col-span-2" label="Ghi chú thêm" error={errors.note?.message}>
              <Textarea {...register("note")} placeholder="Thông tin bổ sung (nếu có)" />
            </Field>

            <div className="sm:col-span-2">
              <label className="flex items-start gap-3 rounded-lg border p-3">
                <input type="checkbox" className="mt-0.5 size-4" {...register("consent")} />
                <span className="text-sm text-muted-foreground">
                  Tôi đồng ý để Legal360 và công ty luật vận hành hệ thống thu thập, lưu trữ và xử lý thông tin/tài liệu
                  doanh nghiệp phục vụ mục đích khảo sát pháp lý. Tôi hiểu rằng hệ thống ứng dụng công nghệ hiện đại để hỗ trợ
                  rà soát và phân loại tài liệu, còn mọi đánh giá và kết luận pháp lý cuối cùng đều do luật sư phụ trách thực hiện và phê duyệt. <span className="text-red-500">*</span>
                </span>
              </label>
              <FieldError message={errors.consent?.message as string | undefined} />
            </div>
          </div>
        ) : null}

        {submit.status === "error" ? (
          <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{submit.message}</p>
        ) : null}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Quay lại
            </Button>
          ) : (
            <Link href="/" className={buttonVariants({ variant: "ghost" })}>Hủy</Link>
          )}

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Tiếp tục <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={submit.status === "submitting"}>
              {submit.status === "submitting" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Đang gửi...
                </>
              ) : (
                "Gửi phiếu yêu cầu"
              )}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
