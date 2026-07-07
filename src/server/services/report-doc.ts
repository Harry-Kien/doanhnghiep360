// Sinh báo cáo khảo sát pháp lý THẬT (DOCX + HTML in PDF) từ dữ liệu hồ sơ đã review.
// Nguồn: organization + case + finding đã được luật sư duyệt (có evidence) + risk scores + roadmap.
import { getDb } from "@/server/db";
import { isFindingFinalReady } from "@/server/services/report";
import type { Case, LegalFinding, Organization, RoadmapItem, RiskScore } from "@/shared/types";
import type { RiskLevel } from "@/shared/constants";

const RISK_LABEL: Record<RiskLevel, string> = { critical: "Nghiêm trọng", high: "Cao", medium: "Trung bình", low: "Thấp" };
const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_HEX: Record<RiskLevel, string> = { critical: "B91C1C", high: "C2410C", medium: "B45309", low: "047857" };
const PHASE_LABEL: Record<RoadmapItem["phase"], string> = { d30: "0-30 ngày", d60: "30-60 ngày", d90: "60-90 ngày" };
const PRIORITY_LABEL: Record<RoadmapItem["priority"], string> = { high: "Cao", med: "Trung bình", low: "Thấp" };

export interface ReportModel {
  org: Organization | null;
  theCase: Case;
  caseCode: string;
  generatedAt: string;
  findings: LegalFinding[];
  riskScores: RiskScore[];
  roadmap: RoadmapItem[];
  counts: Record<RiskLevel, number>;
}

export function buildReportModel(caseId: string): ReportModel | null {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) return null;
  const org = db.organizations.find((o) => o.id === theCase.orgId) ?? null;
  const findings = db.findings
    .filter((f) => f.caseId === caseId && isFindingFinalReady(f))
    .sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]);
  const counts: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.riskLevel] += 1;
  return {
    org,
    theCase,
    caseCode: theCase.caseCode ?? "DN-PENDING",
    generatedAt: new Date().toISOString(),
    findings,
    riskScores: db.riskScores.filter((r) => r.caseId === caseId),
    roadmap: db.roadmapItems.filter((r) => r.caseId === caseId),
    counts,
  };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ─────────────────────────── DOCX ───────────────────────────
export async function generateReportDocx(model: ReportModel): Promise<Buffer> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;

  const NAVY = "0B1B33";
  const GOLD = "B7791F";

  const metaRow = (label: string, value: string) =>
    new TableRow({
      children: [
        new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
        new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph(value || "—")] }),
      ],
    });

  const children: unknown[] = [];

  // Tiêu đề
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "LUẬT NGỌC SƠN", bold: true, color: NAVY, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BÁO CÁO KHẢO SÁT PHÁP LÝ DOANH NGHIỆP 360°", bold: true, color: GOLD, size: 30 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Mã hồ sơ: ${model.caseCode}`, italics: true, size: 20 })] }),
  );

  // Thông tin doanh nghiệp
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "1. Thông tin doanh nghiệp", bold: true, color: NAVY })] }));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        metaRow("Tên doanh nghiệp", model.org?.name ?? "—"),
        metaRow("Mã số thuế", model.org?.taxCode ?? "—"),
        metaRow("Địa chỉ", model.org?.address ?? "—"),
        metaRow("Loại hình", model.org?.businessType ?? "—"),
        metaRow("Ngành nghề", model.org?.industry ?? "—"),
        metaRow("Ngày lập báo cáo", fmtDate(model.generatedAt)),
      ],
    }),
  );

  // Tổng quan rủi ro
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300 }, children: [new TextRun({ text: "2. Tổng quan rủi ro", bold: true, color: NAVY })] }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Tổng số phát hiện đã thẩm định: ${model.findings.length}. ` }),
        new TextRun({ text: `Nghiêm trọng: ${model.counts.critical}, Cao: ${model.counts.high}, Trung bình: ${model.counts.medium}, Thấp: ${model.counts.low}.` }),
      ],
    }),
  );

  // Phát hiện chi tiết
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300 }, children: [new TextRun({ text: "3. Phát hiện & khuyến nghị", bold: true, color: NAVY })] }));
  if (model.findings.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "Chưa có phát hiện nào được luật sư phê duyệt tại thời điểm xuất báo cáo.", italics: true })] }));
  }
  model.findings.forEach((f, i) => {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({ text: `${i + 1}. [${RISK_LABEL[f.riskLevel]}] ${f.title}`, bold: true, color: RISK_HEX[f.riskLevel] }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: f.description })] }),
    );
    if (f.recommendation) {
      children.push(new Paragraph({ children: [new TextRun({ text: "Khuyến nghị: ", bold: true }), new TextRun({ text: f.recommendation })] }));
    }
    for (const ev of f.evidence) {
      const basis = ev.legalBasis ? ` (Căn cứ: ${ev.legalBasis})` : "";
      children.push(new Paragraph({ children: [new TextRun({ text: `• Dẫn chứng: ${ev.snippet}${basis}`, size: 18, color: "555555" })] }));
    }
  });

  // Roadmap
  if (model.roadmap.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300 }, children: [new TextRun({ text: "4. Lộ trình xử lý 30-90 ngày", bold: true, color: NAVY })] }));
    const headerCell = (t: string) =>
      new TableCell({ shading: { fill: NAVY }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })] })] });
    const rows = [
      new TableRow({ children: [headerCell("Giai đoạn"), headerCell("Hạng mục"), headerCell("Ưu tiên"), headerCell("Hạn")] }),
      ...model.roadmap.map(
        (r) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(PHASE_LABEL[r.phase])] }),
              new TableCell({ children: [new Paragraph(r.title)] }),
              new TableCell({ children: [new Paragraph(PRIORITY_LABEL[r.priority])] }),
              new TableCell({ children: [new Paragraph(r.dueAt ? fmtDate(r.dueAt) : "—")] }),
            ],
          }),
      ),
    ];
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
  }

  // Tuyên bố miễn trừ
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 8 } },
      children: [
        new TextRun({
          text: "Báo cáo được lập bởi Luật Ngọc Sơn trên cơ sở tài liệu do doanh nghiệp cung cấp và đã được luật sư phụ trách thẩm định. Báo cáo phục vụ mục đích khảo sát pháp lý nội bộ.",
          italics: true,
          size: 16,
          color: "777777",
        }),
      ],
    }),
  );

  const doc = new Document({ sections: [{ children: children as never }] });
  const blob = await Packer.toBuffer(doc);
  return Buffer.from(blob);
}

// ─────────────────────────── HTML (xem & in PDF) ───────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderReportHtml(model: ReportModel): string {
  const findingsHtml = model.findings.length
    ? model.findings
        .map((f, i) => {
          const evid = f.evidence
            .map((e) => `<li>${esc(e.snippet)}${e.legalBasis ? ` <em>(Căn cứ: ${esc(e.legalBasis)})</em>` : ""}</li>`)
            .join("");
          return `<div class="finding risk-${f.riskLevel}">
            <h3>${i + 1}. <span class="tag">${RISK_LABEL[f.riskLevel]}</span> ${esc(f.title)}</h3>
            <p>${esc(f.description)}</p>
            ${f.recommendation ? `<p><strong>Khuyến nghị:</strong> ${esc(f.recommendation)}</p>` : ""}
            ${evid ? `<ul class="evidence">${evid}</ul>` : ""}
          </div>`;
        })
        .join("")
    : `<p><em>Chưa có phát hiện nào được luật sư phê duyệt tại thời điểm xuất báo cáo.</em></p>`;

  const roadmapHtml = model.roadmap.length
    ? `<table><thead><tr><th>Giai đoạn</th><th>Hạng mục</th><th>Ưu tiên</th><th>Hạn</th></tr></thead><tbody>${model.roadmap
        .map((r) => `<tr><td>${PHASE_LABEL[r.phase]}</td><td>${esc(r.title)}</td><td>${PRIORITY_LABEL[r.priority]}</td><td>${r.dueAt ? fmtDate(r.dueAt) : "—"}</td></tr>`)
        .join("")}</tbody></table>`
    : "";

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Báo cáo khảo sát pháp lý — ${esc(model.caseCode)}</title>
<style>
  :root{--navy:#0B1B33;--gold:#B7791F}
  *{box-sizing:border-box} body{font-family:'Be Vietnam Pro',Arial,sans-serif;color:#1a2230;max-width:820px;margin:0 auto;padding:40px 28px;line-height:1.6}
  .firm{text-align:center;color:var(--navy);font-weight:700;letter-spacing:.5px}
  h1{text-align:center;color:var(--gold);font-size:24px;margin:.2em 0}
  .code{text-align:center;font-style:italic;color:#555;margin-bottom:24px}
  h2{color:var(--navy);border-bottom:2px solid var(--gold);padding-bottom:4px;margin-top:32px;font-size:18px}
  table{width:100%;border-collapse:collapse;margin:12px 0} th,td{border:1px solid #d8dde6;padding:8px 10px;text-align:left;font-size:14px}
  thead th{background:var(--navy);color:#fff}
  .meta td:first-child{font-weight:600;width:32%;background:#f6f8fb}
  .finding{border-left:4px solid #ccc;padding:8px 14px;margin:14px 0;background:#fafbfd;border-radius:0 6px 6px 0}
  .finding h3{margin:.2em 0;font-size:15px}
  .tag{font-size:11px;padding:2px 8px;border-radius:99px;color:#fff;vertical-align:middle}
  .risk-critical{border-color:#B91C1C} .risk-critical .tag{background:#B91C1C}
  .risk-high{border-color:#C2410C} .risk-high .tag{background:#C2410C}
  .risk-medium{border-color:#B45309} .risk-medium .tag{background:#B45309}
  .risk-low{border-color:#047857} .risk-low .tag{background:#047857}
  .evidence{font-size:13px;color:#555;margin:.3em 0} .summary{background:#f6f8fb;padding:12px 16px;border-radius:8px}
  .disclaimer{margin-top:36px;border-top:1px solid #ccc;padding-top:12px;font-size:12px;color:#777;font-style:italic}
  .print-hint{text-align:center;margin:0 0 20px}
  .print-hint button{background:var(--navy);color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer}
  @media print{.print-hint{display:none}}
</style></head><body>
  <p class="print-hint"><button onclick="window.print()">In / Lưu PDF</button></p>
  <p class="firm">LUẬT NGỌC SƠN</p>
  <h1>BÁO CÁO KHẢO SÁT PHÁP LÝ DOANH NGHIỆP 360°</h1>
  <p class="code">Mã hồ sơ: ${esc(model.caseCode)} · Lập ngày ${fmtDate(model.generatedAt)}</p>

  <h2>1. Thông tin doanh nghiệp</h2>
  <table class="meta"><tbody>
    <tr><td>Tên doanh nghiệp</td><td>${esc(model.org?.name ?? "—")}</td></tr>
    <tr><td>Mã số thuế</td><td>${esc(model.org?.taxCode ?? "—")}</td></tr>
    <tr><td>Địa chỉ</td><td>${esc(model.org?.address ?? "—")}</td></tr>
    <tr><td>Loại hình</td><td>${esc(model.org?.businessType ?? "—")}</td></tr>
    <tr><td>Ngành nghề</td><td>${esc(model.org?.industry ?? "—")}</td></tr>
  </tbody></table>

  <h2>2. Tổng quan rủi ro</h2>
  <p class="summary">Tổng số phát hiện đã thẩm định: <strong>${model.findings.length}</strong> ·
    Nghiêm trọng: ${model.counts.critical} · Cao: ${model.counts.high} · Trung bình: ${model.counts.medium} · Thấp: ${model.counts.low}</p>

  <h2>3. Phát hiện &amp; khuyến nghị</h2>
  ${findingsHtml}

  ${roadmapHtml ? `<h2>4. Lộ trình xử lý 30-90 ngày</h2>${roadmapHtml}` : ""}

  <p class="disclaimer">Báo cáo được lập bởi Luật Ngọc Sơn trên cơ sở tài liệu do doanh nghiệp cung cấp và đã được luật sư phụ trách thẩm định. Phục vụ mục đích khảo sát pháp lý nội bộ.</p>
</body></html>`;
}
