"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Receipt, FileSignature, Banknote, CheckCircle2, Copy, Download, UploadCloud } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VND, PACKAGE_META, PAYMENT_INSTRUCTIONS, type ServicePackage } from "@/shared/constants";
import type { Proposal, Contract, Payment } from "@/shared/types";

export function CommercialPortal({
  caseId,
  caseCode,
  orgName,
  proposal,
  contract,
  payments,
}: {
  caseId: string;
  caseCode: string | null;
  orgName: string;
  proposal: Proposal | null;
  contract: Contract | null;
  payments: Payment[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function act(type: string, id?: string) {
    setPending(type);
    setMsg(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/portal-commercial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg({ kind: "err", text: json?.error?.message ?? "Thao tác thất bại." });
      } else {
        router.refresh();
        if (type === "notify_payment") setMsg({ kind: "ok", text: "Đã gửi thông báo. Bộ phận tiếp nhận sẽ xác nhận khoản thanh toán của bạn." });
      }
    } catch {
      setMsg({ kind: "err", text: "Không thể kết nối máy chủ." });
    } finally {
      setPending(null);
    }
  }

  const signedRef = React.useRef<HTMLInputElement>(null);
  async function uploadSignedContract(contractId: string, file: File) {
    setPending("sign-upload");
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("contractId", contractId);
      fd.append("file", file, file.name);
      const res = await fetch(`/api/cases/${caseId}/contract/sign-upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) setMsg({ kind: "err", text: json?.error?.message ?? "Tải lên thất bại." });
      else {
        router.refresh();
        setMsg({ kind: "ok", text: "Đã tải lên hợp đồng đã ký. Vui lòng tiến hành thanh toán." });
      }
    } catch {
      setMsg({ kind: "err", text: "Không thể kết nối máy chủ." });
    } finally {
      setPending(null);
      if (signedRef.current) signedRef.current.value = "";
    }
  }

  const hasPaid = payments.some((p) => p.status === "paid");
  const transferNote = `${caseCode ?? ""} ${orgName}`.trim();

  // Không có gì để hiển thị (chưa có báo phí) ⇒ ẩn cả khối.
  if (!proposal && !contract && !hasPaid) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="font-display text-lg">Báo phí · Hợp đồng · Thanh toán</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {/* BÁO PHÍ */}
        {proposal ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><Receipt className="size-4 text-muted-foreground" /> Báo phí {proposal.code}</p>
              {proposal.status === "accepted" ? <Badge tone="success"><CheckCircle2 className="size-3" /> Đã đồng ý</Badge> : <Badge tone="warning">Chờ bạn xác nhận</Badge>}
            </div>
            <div className="mt-3 grid gap-1 text-sm">
              <Row label="Gói dịch vụ" value={PACKAGE_META[proposal.package as ServicePackage]?.label ?? proposal.package} />
              <Row label="Phí dịch vụ" value={VND.format(proposal.amount)} />
              <Row label="VAT" value={VND.format(proposal.vatAmount)} />
              <Row label="Tổng cộng" value={VND.format(proposal.amount + proposal.vatAmount)} strong />
            </div>
            {proposal.status === "sent" ? (
              <Button className="mt-3 w-full sm:w-auto" disabled={pending !== null} onClick={() => act("accept_proposal", proposal.id)}>
                {pending === "accept_proposal" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Đồng ý báo phí
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* HỢP ĐỒNG */}
        {contract ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><FileSignature className="size-4 text-muted-foreground" /> Hợp đồng {contract.code}</p>
              {contract.status === "signed" ? <Badge tone="success"><CheckCircle2 className="size-3" /> Đã xác nhận</Badge> : <Badge tone="warning">Chờ bạn xác nhận</Badge>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Mẫu hợp đồng: {contract.templateVersion}. Tải về, đọc kỹ và ký số (PDF), sau đó tải bản đã ký lên.</p>

            {/* Tải mẫu hợp đồng — luôn cho tải */}
            <a
              href={`/api/cases/${caseId}/contract/download?contractId=${contract.id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <Download className="size-4" /> Tải hợp đồng (DOCX)
            </a>

            {contract.status === "sent" ? (
              <div className="mt-3 space-y-3 rounded-md bg-muted/40 p-3">
                <div>
                  <p className="text-sm font-medium">Cách 1 — Ký số rồi tải lên (khuyến nghị)</p>
                  <input
                    ref={signedRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadSignedContract(contract.id, f);
                    }}
                  />
                  <Button variant="outline" className="mt-1.5 w-full sm:w-auto" disabled={pending !== null} onClick={() => signedRef.current?.click()}>
                    {pending === "sign-upload" ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                    Tải lên hợp đồng đã ký
                  </Button>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium">Cách 2 — Xác nhận đồng ý nhanh (không cần ký số)</p>
                  <Button variant="ghost" className="mt-1.5 w-full sm:w-auto" disabled={pending !== null} onClick={() => act("accept_contract", contract.id)}>
                    {pending === "accept_contract" ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />}
                    Xác nhận đã đọc &amp; đồng ý hợp đồng
                  </Button>
                </div>
              </div>
            ) : contract.status === "signed" && contract.signedAt ? (
              <p className="mt-2 text-xs text-emerald-600">Đã xác nhận lúc {new Date(contract.signedAt).toLocaleString("vi-VN")}.</p>
            ) : null}
          </div>
        ) : null}

        {/* THANH TOÁN */}
        {(contract?.status === "signed" || hasPaid) ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><Banknote className="size-4 text-muted-foreground" /> Thanh toán</p>
              {hasPaid ? <Badge tone="success"><CheckCircle2 className="size-3" /> Đã nhận thanh toán</Badge> : <Badge tone="warning">Chờ thanh toán</Badge>}
            </div>
            {!hasPaid ? (
              <>
                <div className="mt-3 grid gap-1 rounded-md bg-muted/40 p-3 text-sm">
                  <Row label="Ngân hàng" value={PAYMENT_INSTRUCTIONS.bankName} />
                  <Row label="Chủ tài khoản" value={PAYMENT_INSTRUCTIONS.accountName} />
                  <Row label="Số tài khoản" value={PAYMENT_INSTRUCTIONS.accountNumber} copy />
                  <Row label="Nội dung CK" value={transferNote || PAYMENT_INSTRUCTIONS.noteHint} copy />
                </div>
                <Button variant="outline" className="mt-3 w-full sm:w-auto" disabled={pending !== null} onClick={() => act("notify_payment")}>
                  {pending === "notify_payment" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Tôi đã chuyển khoản
                </Button>
              </>
            ) : (
              <p className="mt-2 text-xs text-emerald-600">Cảm ơn bạn. Khoản thanh toán đã được ghi nhận, hồ sơ sẽ được mở để xử lý.</p>
            )}
          </div>
        ) : null}

        {msg ? (
          <p className={`text-sm ${msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong, copy }: { label: string; value: string; strong?: boolean; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1.5 text-right ${strong ? "font-semibold text-foreground" : "text-foreground"}`}>
        {value}
        {copy ? (
          <button type="button" onClick={() => navigator.clipboard?.writeText(value)} title="Sao chép" className="text-muted-foreground hover:text-foreground">
            <Copy className="size-3.5" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
