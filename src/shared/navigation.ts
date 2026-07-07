import type { Role } from "@/shared/roles";

export const HOME_BY_ROLE: Record<Role, string> = {
  admin: "/admin",
  intake: "/intake",
  lawyer: "/lawyer",
  reviewer: "/lawyer",
  staff: "/lawyer",
  accountant: "/ke-toan",
  customer: "/portal",
};

function cleanNext(next?: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function inPath(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isNextAllowedForRole(role: Role, next?: string): boolean {
  const path = cleanNext(next);
  if (!path) return false;
  if (role === "customer") return inPath(path, ["/portal"]);
  if (role === "admin") return inPath(path, ["/admin", "/intake", "/lawyer", "/ke-toan", "/cases"]);
  if (role === "intake") return inPath(path, ["/intake", "/cases"]);
  if (role === "lawyer" || role === "reviewer" || role === "staff") return inPath(path, ["/lawyer", "/cases"]);
  if (role === "accountant") return inPath(path, ["/ke-toan", "/cases"]);
  return false;
}

export function targetForRole(role: Role, next?: string): string {
  return isNextAllowedForRole(role, next) ? cleanNext(next)! : HOME_BY_ROLE[role];
}
