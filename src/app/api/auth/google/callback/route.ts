import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { env, isGoogleOAuthConfigured } from "@/lib/env";
import { loginWithVerifiedEmail } from "@/server/services/verification";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { recordAudit } from "@/server/services/audit";

// GET /api/auth/google/callback — Google chuyển về kèm code; xác thực email rồi cấp phiên khách hàng.
export async function GET(req: NextRequest) {
  const redirect = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!isGoogleOAuthConfigured()) return redirect("/login?error=google_unavailable");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("g_oauth_state")?.value;

  // Chống CSRF: state phải khớp cookie.
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirect("/login?error=google_state");
  }

  try {
    const client = new OAuth2Client(env.googleOAuth.clientId, env.googleOAuth.clientSecret, env.googleOAuth.redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) return redirect("/login?error=google_failed");

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.googleOAuth.clientId });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email || payload?.email_verified !== true) {
      return redirect("/login?error=google_email");
    }

    // Gate: chỉ email ĐÃ ĐĂNG KÝ khảo sát mới vào được portal.
    const userId = loginWithVerifiedEmail(email);
    if (!userId) {
      return redirect("/login?error=not_registered");
    }

    recordAudit({
      actorId: userId,
      actorLabel: "Khách hàng (Google)",
      action: "auth.google_login",
      entityType: "user",
      entityId: userId,
      metadata: { email },
    });

    const res = redirect("/portal");
    res.cookies.set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions());
    res.cookies.delete("g_oauth_state");
    return res;
  } catch {
    return redirect("/login?error=google_failed");
  }
}
