"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_META, type Role } from "@/shared/roles";

export function AccountMenu({ name, role }: { name: string; role: Role }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-none">{name}</p>
        <p className="text-xs text-muted-foreground">{ROLE_META[role].label}</p>
      </div>
      <Button variant="outline" size="sm" onClick={logout} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        Đăng xuất
      </Button>
    </div>
  );
}
