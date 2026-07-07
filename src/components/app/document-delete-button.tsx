"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

/** Nút gỡ tài liệu up nhầm. Có xác nhận trước khi xóa vĩnh viễn trên Drive. */
export function DocumentDeleteButton({
  caseId,
  docId,
  fileName,
}: {
  caseId: string;
  docId: string;
  fileName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(`Gỡ vĩnh viễn tài liệu "${fileName}" khỏi hồ sơ? Thao tác này không thể hoàn tác.`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${docId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Không gỡ được tài liệu.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      title={error ?? "Gỡ tài liệu up nhầm"}
      aria-label="Gỡ tài liệu"
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
        error
          ? "border-red-300 text-red-600"
          : "text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600"
      }`}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      Gỡ
    </button>
  );
}
