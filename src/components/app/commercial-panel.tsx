"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShieldAlert, FileSignature, Receipt, Banknote, CheckCircle2, Download, UploadCloud } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SERVICE_PACKAGES, PACKAGE_META, VND, type ServicePackage } from "@/shared/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { CaseStatus } from "@/shared/status";
import type { ConflictCheck, Contract, Payment, Proposal } from "@/shared/types";

interface Props {
  caseId: string;
  status: CaseStatus;
  conflict: ConflictCheck | null;
  proposals: Proposal[];
  contracts: Contract[];
  payments: Payment[];
  /** Được phép thao tác conflict/báo phí/hợp đồng (intake/admin). */
  canCommercial?: boolean;
  /** Được phép ghi nhận thanh toán (intake/admin/kế toán). */
  canPayment?: boolean;
}

const CONFLICT_LABEL: Record<string, string> = { clear: "Không xung đột", potential_conflict: "Nghi ngờ xung đột", rejected: "Từ chối (xung đột)" };
const PROPOSAL_STATUS: Record<string, string> = { draft: "Nháp", sent: "Đã gửi", accepted: "Đã chấp nhận", rejected: "Từ chối" };
const CONTRACT_STATUS: Record<string, string> = { draft: "Nháp", sent: "Chờ ký", signed: "Đã ký", void: "Hủy" };

export function CommercialPanel(props: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // form state
  const [conflictResult, setConflictResult] = React.useState("clear");
  const [conflictNote, setConflictNote] = React.useState("");
  const [pkg, setPkg] = React.useState<ServicePackage>("pro");
  const [milestone, setMilestone] = React.useState("deposit");
  const [payAmount, setPayAmount] = React.useState("");
  const companyRef = React.useRef<HTMLInputElement>(null);

  async function uploadCompanySigned(file: File) {
    setPending("company-sign");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch(`/api/cases/${props.caseId}/contract/company-sign`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) setError(json?.error?.message ?? "Gửi hợp đồng thất bại.");
      else router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setPending(null);
      if (companyRef.current) companyRef.current.value = "";
    }
  }

  async function call(url: string, body: unknown, key: string) {
    setPending(key);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Thao tác thất bại.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Không thể kết nối máy chủ.");
      return false;
    } finally {
      setPending(null);
    }
  }

  const canCommercial = props.canCommercial ?? true;
  const canPayment = props.canPayment ?? true;
  const conflictDone = props.conflict?.result === "clear";
  const hasSentProposal = props.proposals.some((p) => p.status === "sent" || p.status === "accepted");
  const hasSignedContract = props.contracts.some((c) => c.status === "signed");
  const base = PACKAGE_META[pkg].price;
  const vat = Math.round(base * 0.08);
  const totalPaid = props.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Conflict check */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4" /> Conflict check</CardTitle></CardHeader>
        <CardContent>
          {props.conflict ? (
            <div className="mb-4 flex items-center gap-2">
              <Badge tone={props.conflict.result === "clear" ? "success" : props.conflict.result === "rejected" ? "danger" : "warning"}>
                {props.conflict.result === "clear" ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
                {CONFLICT_LABEL[props.conflict.result]}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDateTime(props.conflict.createdAt)}</span>
            </div>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">Chưa kiểm tra xung đột lợi ích.</p>
          )}

          {!conflictDone && canCommercial ? (
            <div className="space-y-3">
              <div>
                <Label className="mb-1 block">Kết quả</Label>
                <Select value={conflictResult} onChange={(e) => setConflictResult(e.target.value)}>
                  <option value="clear">Không có xung đột</option>
                  <option value="potential_conflict">Nghi ngờ — cần partner duyệt</option>
                  <option value="rejected">Có xung đột — từ chối</option>
                </Select>
              </div>
              <Textarea value={conflictNote} onChange={(e) => setConflictNote(e.target.value)} placeholder="Ghi chú (đối tượng đã đối chiếu...)" />
              <Button
                onClick={() => call(`/api/cases/${props.caseId}/conflict-check`, { result: conflictResult, note: conflictNote || undefined }, "conflict")}
                disabled={pending !== null}
              >
                {pending === "conflict" ? <Loader2 className="size-4 animate-spin" /> : null} Lưu kết quả conflict check
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Proposal */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="size-4" /> Báo phí dịch vụ</CardTitle></CardHeader>
        <CardContent>
          {props.proposals.length > 0 ? (
            <ul className="mb-4 divide-y divide-border rounded-md border">
              {props.proposals.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <span className="font-mono text-xs">{p.code}</span>
                    <span className="ml-2">{PACKAGE_META[p.package].label} · {VND.format(p.amount + p.vatAmount)}</span>
                  </div>
                  <Badge tone={p.status === "sent" ? "info" : p.status === "draft" ? "neutral" : "success"}>{PROPOSAL_STATUS[p.status]}</Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {conflictDone && canCommercial ? (
            <div className="space-y-3">
              <div>
                <Label className="mb-1 block">Gói dịch vụ</Label>
                <Select value={pkg} onChange={(e) => setPkg(e.target.value as ServicePackage)}>
                  {SERVICE_PACKAGES.map((k) => (
                    <option key={k} value={k}>{PACKAGE_META[k].label}{PACKAGE_META[k].price > 0 ? ` — ${VND.format(PACKAGE_META[k].price)}` : ""}</option>
                  ))}
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">Phí: {VND.format(base)} + VAT 8% ({VND.format(vat)}) = <span className="font-medium text-foreground">{VND.format(base + vat)}</span></p>
              <Button
                onClick={() => call(`/api/cases/${props.caseId}/proposal`, { package: pkg, amount: base, vatAmount: vat, send: true }, "proposal")}
                disabled={pending !== null || base === 0}
              >
                {pending === "proposal" ? <Loader2 className="size-4 animate-spin" /> : null} Tạo & gửi báo phí
              </Button>
              {base === 0 ? <p className="text-xs text-amber-600">Gói Enterprise cần báo giá riêng — liên hệ trực tiếp.</p> : null}
            </div>
          ) : canCommercial && !conflictDone ? (
            <p className="text-sm text-muted-foreground">Cần hoàn tất conflict check (không xung đột) trước khi gửi báo phí.</p>
          ) : !canCommercial && props.proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có báo phí. Bước này do Intake/Sales thực hiện.</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Contract */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileSignature className="size-4" /> Hợp đồng dịch vụ</CardTitle></CardHeader>
        <CardContent>
          {props.contracts.length > 0 ? (
            <ul className="mb-4 divide-y divide-border rounded-md border">
              {props.contracts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <span className="font-mono text-xs">{c.code}</span>
                    <span className="ml-2 text-muted-foreground">{c.templateVersion}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={c.status === "signed" ? "success" : "info"}>{CONTRACT_STATUS[c.status]}</Badge>
                    {canCommercial ? (
                      <a
                        href={`/api/cases/${props.caseId}/contract/download?contractId=${c.id}`}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Download className="size-3.5" /> Tải HĐ
                      </a>
                    ) : null}
                    {canCommercial ? (
                      <Button size="sm" variant="outline" onClick={() => companyRef.current?.click()} disabled={pending !== null}>
                        {pending === "company-sign" ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-3.5" />} Gửi HĐ công ty đã ký
                      </Button>
                    ) : null}
                    {c.status !== "signed" && canCommercial ? (
                      <Button size="sm" variant="ghost" onClick={() => call(`/api/cases/${props.caseId}/contract`, { action: "sign", contractId: c.id }, `sign-${c.id}`)} disabled={pending !== null}>
                        {pending === `sign-${c.id}` ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Đánh dấu đã ký
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {hasSentProposal && canCommercial ? (
            <Button variant={props.contracts.length ? "outline" : "default"} onClick={() => call(`/api/cases/${props.caseId}/contract`, { templateVersion: "HD-DV-PHAP-LY-v1" }, "contract")} disabled={pending !== null}>
              {pending === "contract" ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />} Tạo hợp đồng từ template
            </Button>
          ) : canCommercial && !hasSentProposal ? (
            <p className="text-sm text-muted-foreground">Cần gửi báo phí trước khi tạo hợp đồng.</p>
          ) : null}
          {canCommercial ? (
            <input
              ref={companyRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCompanySigned(f);
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="size-4" /> Thanh toán</CardTitle></CardHeader>
        <CardContent>
          {props.payments.length > 0 ? (
            <ul className="mb-3 divide-y divide-border rounded-md border">
              {props.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span>{p.milestone === "deposit" ? "Tạm ứng" : "Thanh toán cuối"} · {VND.format(p.amount)}</span>
                  <span className="text-xs text-muted-foreground">{p.method ?? "—"} · {formatDate(p.paidAt)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mb-3 text-sm">Đã thu: <span className="font-medium">{VND.format(totalPaid)}</span></p>

          {(hasSignedContract || props.payments.length > 0 || props.status === "payment_pending") && canPayment ? (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="mb-1 block">Đợt</Label>
                <Select value={milestone} onChange={(e) => setMilestone(e.target.value)} className="w-36">
                  <option value="deposit">Tạm ứng</option>
                  <option value="final">Thanh toán cuối</option>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Số tiền (VND)</Label>
                <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="VD: 6000000" className="w-40" />
              </div>
              <Button
                onClick={() => call(`/api/cases/${props.caseId}/payment`, { milestone, amount: Number(payAmount) || 0 }, "pay")}
                disabled={pending !== null || !payAmount}
              >
                {pending === "pay" ? <Loader2 className="size-4 animate-spin" /> : null} Ghi nhận đã thu
              </Button>
            </div>
          ) : canPayment ? (
            <p className="text-sm text-muted-foreground">Ghi nhận thanh toán sau khi hợp đồng được ký.</p>
          ) : null}
        </CardContent>
      </Card>

      {error ? <p className="rounded-md bg-red-50 p-2.5 text-sm text-red-700 lg:col-span-2">{error}</p> : null}
    </div>
  );
}
