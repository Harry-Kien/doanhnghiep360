"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, KeyRound, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { INTERNAL_ROLES, ROLE_META, type Role } from "@/shared/roles";

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export function UserAdmin({ initialUsers, currentUserId }: { initialUsers: StaffUser[]; currentUserId: string | null }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // form tạo mới
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState<Role>("staff");
  const [password, setPassword] = React.useState("");

  async function call(url: string, method: string, body: unknown, key: string) {
    setPending(key);
    setMsg(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg({ kind: "err", text: json?.error?.message ?? "Thao tác thất bại." });
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setMsg({ kind: "err", text: "Không thể kết nối máy chủ." });
      return false;
    } finally {
      setPending(null);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const okRes = await call("/api/admin/users", "POST", { email, fullName, role, password }, "create");
    if (okRes) {
      setMsg({ kind: "ok", text: `Đã tạo tài khoản ${email}.` });
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("staff");
    }
  }

  async function changeRole(id: string, newRole: Role) {
    await call(`/api/admin/users/${id}`, "PATCH", { role: newRole }, `role-${id}`);
  }
  async function toggleActive(id: string, active: boolean) {
    await call(`/api/admin/users/${id}`, "PATCH", { isActive: active }, `act-${id}`);
  }
  async function resetPassword(id: string, email: string) {
    const pw = window.prompt(`Đặt mật khẩu mới cho ${email} (tối thiểu 8 ký tự):`);
    if (!pw) return;
    const okRes = await call(`/api/admin/users/${id}`, "PATCH", { password: pw }, `pw-${id}`);
    if (okRes) setMsg({ kind: "ok", text: `Đã đặt lại mật khẩu cho ${email}.` });
  }

  return (
    <div className="space-y-5">
      {/* Tạo tài khoản */}
      <section className="section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Tạo tài khoản nhân sự</h2>
            <p className="section-subtitle">Cấp tài khoản theo vai trò. Nhân sự đăng nhập tại /nhan-vien bằng email + mật khẩu này.</p>
          </div>
        </div>
        <form onSubmit={createUser} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="mb-1 block">Họ tên</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <Label className="mb-1 block">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="a@ngocson.vn" />
          </div>
          <div>
            <Label className="mb-1 block">Vai trò</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {INTERNAL_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label className="mb-1 block">Mật khẩu tạm</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="text" placeholder="≥ 8 ký tự" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={pending !== null || !email || !fullName || password.length < 8}>
              {pending === "create" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </section>

      {msg ? (
        <p className={`rounded-md p-2.5 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
      ) : null}

      {/* Danh sách */}
      <section className="section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Tài khoản nội bộ ({initialUsers.length})</h2>
            <p className="section-subtitle">Đổi vai trò, khóa/mở, đặt lại mật khẩu.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Nhân sự</th>
                <th className="px-4 py-2.5 font-semibold">Vai trò</th>
                <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                <th className="px-4 py-2.5 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.fullName}{u.id === currentUserId ? " (bạn)" : ""}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      disabled={pending !== null}
                      className="h-8 w-44"
                    >
                      {INTERNAL_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Đang hoạt động" : "Đã khóa"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => resetPassword(u.id, u.email)} disabled={pending !== null}>
                        <KeyRound className="size-3.5" /> Mật khẩu
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(u.id, !u.isActive)}
                        disabled={pending !== null || u.id === currentUserId}
                        className={u.isActive ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 hover:bg-emerald-50"}
                      >
                        {u.isActive ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                        {u.isActive ? "Khóa" : "Mở"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
