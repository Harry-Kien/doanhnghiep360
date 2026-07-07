import Link from "next/link";
import { Banknote, FileSignature, Receipt, Wallet } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/legal360/metric-card";
import { CaseTable } from "@/components/legal360/case-table";
import { Badge } from "@/components/ui/badge";
import { requireSection } from "@/lib/guard";
import { listCases } from "@/server/services/cases";
import { getDb } from "@/server/db";
import { VND } from "@/shared/constants";
import { formatDateTime } from "@/lib/utils";
import type { CaseStatus } from "@/shared/status";

export const metadata = { title: "Kế toán & Thanh toán — Legal360" };

const ACCOUNTING_QUEUE: CaseStatus[] = ["proposal_sent", "contract_pending", "payment_pending"];
const MILESTONE_LABEL: Record<string, string> = { deposit: "Tạm ứng", final: "Quyết toán" };
const PAYMENT_TONE = { paid: "success", pending: "warning", overdue: "danger" } as const;
const PAYMENT_LABEL = { paid: "Đã thu", pending: "Chờ thu", overdue: "Quá hạn" } as const;

export default function AccountingPage() {
  const viewer = requireSection("accounting");
  const db = getDb();
  const cases = listCases(viewer);
  const caseById = new Map(db.cases.map((c) => [c.id, c]));
  const orgById = new Map(db.organizations.map((o) => [o.id, o]));

  const queue = cases.filter((item) => ACCOUNTING_QUEUE.includes(item.status));
  const pendingPayments = db.payments.filter((p) => p.status !== "paid");
  const paidPayments = db.payments.filter((p) => p.status === "paid");
  const paidTotal = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const contractPending = cases.filter((item) => item.status === "contract_pending").length;
  const proposalSent = cases.filter((item) => item.status === "proposal_sent").length;

  const recentPayments = [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  return (
    <AppShell
      role={viewer.role}
      active="/ke-toan"
      surface="light"
      title="Kế toán & thanh toán"
      description="Theo dõi báo phí, hợp đồng và dòng tiền: ghi nhận thanh toán, đối soát các mốc phí và mở hồ sơ khi đã thu đủ tạm ứng."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Thanh toán chờ thu" value={pendingPayments.length} icon={Wallet} tone="warning" href="/ke-toan" />
          <MetricCard label="Đã thu (lũy kế)" value={VND.format(paidTotal)} icon={Banknote} tone="success" />
          <MetricCard label="Hợp đồng chờ ký" value={contractPending} icon={FileSignature} href="/intake?status=contract_pending" />
          <MetricCard label="Báo phí đã gửi" value={proposalSent} icon={Receipt} href="/intake?status=proposal_sent" />
        </div>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Hồ sơ cần xử lý thương mại</h2>
              <p className="section-subtitle">Báo phí, hợp đồng và thanh toán đang chờ kế toán đối soát/ghi nhận.</p>
            </div>
            <Badge tone="warning">{queue.length} hồ sơ</Badge>
          </div>
          <div className="p-4">
            <CaseTable
              items={queue}
              basePath="/cases"
              emptyTitle="Không có hồ sơ cần xử lý"
              emptyDescription="Khi có báo phí/hợp đồng/thanh toán, hồ sơ sẽ xuất hiện ở đây."
            />
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Khoản thanh toán gần đây</h2>
              <p className="section-subtitle">Nhật ký các mốc phí đã ghi nhận trên toàn hệ thống.</p>
            </div>
          </div>
          {recentPayments.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Chưa có khoản thanh toán nào.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentPayments.map((payment) => {
                const theCase = caseById.get(payment.caseId);
                const org = theCase ? orgById.get(theCase.orgId) : undefined;
                return (
                  <Link
                    key={payment.id}
                    href={theCase ? `/cases/${theCase.id}` : "/ke-toan"}
                    className="action-row"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <Banknote className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-950 dark:text-slate-100">
                        {org?.name ?? theCase?.caseCode ?? "Hồ sơ"} · {MILESTONE_LABEL[payment.milestone] ?? payment.milestone}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {theCase?.caseCode ?? "—"} · {formatDateTime(payment.createdAt)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-100">{VND.format(payment.amount)}</span>
                    <Badge tone={PAYMENT_TONE[payment.status]}>{PAYMENT_LABEL[payment.status]}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
