"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, CheckCircle2 } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DOCUMENT_CHECKLIST } from "@/shared/constants";

const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

export function DocumentUploadBox({
  caseId,
  defaultCategory,
  lockCategory = false,
  accept = ACCEPT,
  buttonLabel = "Chọn tệp & tải lên",
  helperText = "Hỗ trợ PDF, DOC/DOCX, JPG, PNG · tối đa 25MB. Tệp được đổi tên theo mã hồ sơ và lưu vào kho tài liệu.",
}: {
  caseId: string;
  defaultCategory?: string;
  lockCategory?: boolean;
  accept?: string;
  buttonLabel?: string;
  helperText?: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [category, setCategory] = React.useState<string>(defaultCategory ?? DOCUMENT_CHECKLIST[0]?.key ?? "01");
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const selectedCategory = DOCUMENT_CHECKLIST.find((item) => item.key === category);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("categoryKey", category);
      form.append("file", file, file.name); // gửi bytes thật (multipart) — KHÔNG set Content-Type thủ công
      const res = await fetch(`/api/cases/${caseId}/documents`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMessage({ kind: "err", text: json?.error?.message ?? "Tải lên thất bại." });
      } else {
        setMessage({ kind: "ok", text: `Đã tải lên: ${json.data.storedName}` });
        router.refresh();
      }
    } catch {
      setMessage({ kind: "err", text: "Không thể kết nối máy chủ." });
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium">Nhóm tài liệu</label>
          {lockCategory ? (
            <div className="flex min-h-10 items-center rounded-md border bg-background px-3 py-2 text-sm font-medium">
              {selectedCategory?.label ?? category}
            </div>
          ) : (
            <Select value={category} onChange={(e) => setCategory(e.target.value)} disabled={pending}>
              {DOCUMENT_CHECKLIST.map((c) => (
                <option key={c.key} value={c.key}>{c.label}{c.required ? " (bắt buộc)" : ""}</option>
              ))}
            </Select>
          )}
        </div>
        <div>
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onPick} />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            {buttonLabel}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
      {message ? (
        <p className={`mt-2 flex items-center gap-1.5 text-sm ${message.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {message.kind === "ok" ? <CheckCircle2 className="size-4" /> : null}
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
