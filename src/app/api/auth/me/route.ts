import { getCurrentUserPublic } from "@/lib/session";
import { ok, fail } from "@/lib/http";

export async function GET() {
  const user = getCurrentUserPublic();
  if (!user) return fail("UNAUTHORIZED", "Chưa đăng nhập.");
  return ok(user);
}
