"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { RISK_LEVELS, RISK_META, SURVEY_SCOPE } from "@/shared/constants";

export function AddFindingForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    riskLevel: "medium",
    groupKey: SURVEY_SCOPE[0]?.key ?? "corporate",
    recommendation: "",
    legalBasis: "",
    evidence: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setPending(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Không thể thêm phát hiện.");
        return;
      }
      setOkMsg(`Đã thêm phát hiện ${json.data.code}.`);
      setForm((f) => ({ ...f, title: "", description: "", recommendation: "", legalBasis: "", evidence: "" }));
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Thêm phát hiện thủ công
      </Button>
    );
  }

  const canSubmit = form.title.trim().length >= 3 && form.description.trim().length >= 3 && form.legalBasis.trim().length >= 3;

  return (
    <div className="space-y-3 rounded-lg border bg-secondary/30 p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold">Thêm phát hiện do luật sư soạn</p>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Đóng">
          <X className="size-4" />
        </button>
      </div>

      <div>
        <Label>Tiêu đề phát hiện *</Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="VD: Hợp đồng lao động thiếu điều khoản thử việc" disabled={pending} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nhóm rủi ro</Label>
          <Select value={form.groupKey} onChange={(e) => set("groupKey", e.target.value)} disabled={pending}>
            {SURVEY_SCOPE.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Mức rủi ro</Label>
          <Select value={form.riskLevel} onChange={(e) => set("riskLevel", e.target.value)} disabled={pending}>
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>{RISK_META[r].label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Nội dung phát hiện *</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Mô tả rủi ro pháp lý phát hiện được…" disabled={pending} />
      </div>

      <div>
        <Label>Căn cứ pháp lý * <span className="text-xs font-normal text-muted-foreground">(bắt buộc để đưa vào báo cáo final)</span></Label>
        <Input value={form.legalBasis} onChange={(e) => set("legalBasis", e.target.value)} placeholder="VD: Bộ luật Lao động 2019, Điều 24" disabled={pending} />
      </div>

      <div>
        <Label>Dẫn chứng từ hồ sơ <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span></Label>
        <Textarea value={form.evidence} onChange={(e) => set("evidence", e.target.value)} rows={2} placeholder="Trích dẫn/điều khoản trong tài liệu khách hàng…" disabled={pending} />
      </div>

      <div>
        <Label>Khuyến nghị xử lý <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span></Label>
        <Textarea value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)} rows={2} placeholder="Đề xuất hướng xử lý cho doanh nghiệp…" disabled={pending} />
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={submit} disabled={pending || !canSubmit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Lưu phát hiện
        </Button>
        {okMsg ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="size-3.5" /> {okMsg}</span> : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
