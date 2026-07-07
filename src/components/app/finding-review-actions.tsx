"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X, FileWarning, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FindingStatus } from "@/shared/types";

export function FindingReviewActions({ findingId, status }: { findingId: string; status: FindingStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [legalBasis, setLegalBasis] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const done = status === "lawyer_accepted" || status === "lawyer_edited" || status === "rejected";

  async function review(action: string, key: string, extra?: Record<string, unknown>) {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(`/api/findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Thao tác thất bại.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => review("accept", "accept")} disabled={pending !== null}>
          {pending === "accept" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Chấp nhận
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)} disabled={pending !== null}>
          <Pencil className="size-4" /> Sửa & thêm căn cứ
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => review("request_docs", "docs")}
          disabled={pending !== null}
        >
          {pending === "docs" ? <Loader2 className="size-4 animate-spin" /> : <FileWarning className="size-4" />}
          Yêu cầu bổ sung
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => review("reject", "reject")}
          disabled={pending !== null}
        >
          {pending === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          Từ chối
        </Button>
        {done ? <span className="self-center text-xs text-emerald-600">Đã xử lý</span> : null}
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-secondary/60 p-3">
          <Input
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
            placeholder="Căn cứ pháp luật (VD: Bộ luật Lao động 2019, Điều 118)"
            className="min-w-[260px] flex-1"
          />
          <Button
            size="sm"
            onClick={() => review("edit", "edit", { legalBasis, recommendation: undefined })}
            disabled={pending !== null || legalBasis.trim().length === 0}
          >
            {pending === "edit" ? <Loader2 className="size-4 animate-spin" /> : null}
            Lưu & duyệt
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
