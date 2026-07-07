import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { env, isGoogleOAuthConfigured } from "@/lib/env";

// GET /api/auth/google — bắt đầu luồng đăng nhập Google (chuyển hướng tới màn hình đồng ý của Google).
export async function GET(req: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", req.url));
  }
  const client = new OAuth2Client(env.googleOAuth.clientId, env.googleOAuth.clientSecret, env.googleOAuth.redirectUri);
  const state = randomBytes(16).toString("hex");
  const url = client.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
  const res = NextResponse.redirect(url);
  // state chống CSRF: cookie ngắn hạn, httpOnly.
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
