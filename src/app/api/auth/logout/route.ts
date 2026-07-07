import { SESSION_COOKIE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { recordAudit } from "@/server/services/audit";
import { ok } from "@/lib/http";

export async function POST() {
  const user = getCurrentUser();
  if (user) recordAudit({ actorId: user.id, actorLabel: user.fullName, action: "auth.logout", entityType: "user", entityId: user.id });
  const res = ok({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
