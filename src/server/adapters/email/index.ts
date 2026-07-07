// Email adapter — interface + mock + SMTP thật (nodemailer, lazy). Server-only.
import { env, isEmailConfigured } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailAdapter {
  readonly mode: "mock" | "smtp";
  send(msg: EmailMessage): Promise<{ ok: boolean; id: string }>;
}

function smtpFromAddress(): string | { name: string; address: string } {
  const raw = (env.smtp.from || env.smtp.user).trim();
  const match = raw.match(/<([^>]+)>/);
  const address = (match?.[1] || raw || env.smtp.user).trim();
  return { name: "Legal360 - Luat Ngoc Son", address };
}

class MockEmailAdapter implements EmailAdapter {
  readonly mode = "mock" as const;
  async send(msg: EmailMessage): Promise<{ ok: boolean; id: string }> {
    // Demo: không gửi thật, ghi log server. OTP được trả về API (devCode) khi ở mock.
    console.info(`[MOCK EMAIL] → ${msg.to} | ${msg.subject}`);
    return { ok: true, id: `mock_${Date.now()}` };
  }
}

class SmtpEmailAdapter implements EmailAdapter {
  readonly mode = "smtp" as const;
  async send(msg: EmailMessage): Promise<{ ok: boolean; id: string }> {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
    const info = await transport.sendMail({
      from: smtpFromAddress(),
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      headers: {
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
    });
    return { ok: true, id: info.messageId };
  }
}

export function getEmailAdapter(): EmailAdapter {
  if (env.emailProvider === "smtp" && isEmailConfigured()) return new SmtpEmailAdapter();
  return new MockEmailAdapter();
}

export function getEmailStatus() {
  if (env.emailProvider === "smtp") {
    return isEmailConfigured()
      ? { mode: "smtp" as const, configured: true, reason: "Đã cấu hình SMTP." }
      : { mode: "mock" as const, configured: false, reason: "EMAIL_PROVIDER=smtp nhưng thiếu SMTP_HOST/USER/PASS — fallback mock." };
  }
  return { mode: "mock" as const, configured: false, reason: "Email mock — OTP hiển thị để demo (chưa gửi email thật)." };
}

/** Mock ⇒ true: cho phép trả devCode về API để demo. */
export function isEmailMock(): boolean {
  return getEmailAdapter().mode === "mock";
}
