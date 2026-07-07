// Sinh HỢP ĐỒNG DỊCH VỤ PHÁP LÝ (DOCX) để khách tải về, ký số, rồi tải lên lại.
import { getDb } from "@/server/db";
import { PACKAGE_META, VND } from "@/shared/constants";
import type { Case, Contract, Organization, Proposal } from "@/shared/types";

const NAVY = "0B1B33";
const GOLD = "B8860B";

export interface ContractModel {
  org: Organization | null;
  theCase: Case;
  contract: Contract;
  proposal: Proposal | null;
  generatedAt: string;
}

export function buildContractModel(caseId: string, contractId: string): ContractModel | null {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) return null;
  const contract = db.contracts.find((c) => c.id === contractId && c.caseId === caseId);
  if (!contract) return null;
  const org = db.organizations.find((o) => o.id === theCase.orgId) ?? null;
  const proposal = contract.proposalId
    ? db.proposals.find((p) => p.id === contract.proposalId) ?? null
    : db.proposals.filter((p) => p.caseId === caseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  return { org, theCase, contract, proposal, generatedAt: new Date().toISOString() };
}

export async function generateContractDocx(model: ContractModel): Promise<Buffer> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
  const m = model;
  const pkg = m.proposal ? PACKAGE_META[m.proposal.package] : null;
  const total = m.proposal ? m.proposal.amount + m.proposal.vatAmount : 0;
  const date = new Date(m.generatedAt);

  const P = (text: string, opts: { bold?: boolean; italics?: boolean; center?: boolean; size?: number; color?: string; before?: number; after?: number } = {}) =>
    new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { before: opts.before ?? 0, after: opts.after ?? 120 },
      children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color })],
    });
  const H = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text, bold: true, color: NAVY })] });

  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, italics: true, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "HỢP ĐỒNG DỊCH VỤ PHÁP LÝ", bold: true, color: GOLD, size: 30 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `Số: ${m.contract.code}`, italics: true, size: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `(Khảo sát Pháp lý Doanh nghiệp 360° — mã hồ sơ ${m.theCase.caseCode ?? "đang mở"})`, italics: true, size: 18 })] }),

    P(`Hôm nay, ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}, chúng tôi gồm:`),

    H("BÊN A — BÊN CUNG CẤP DỊCH VỤ"),
    P("CÔNG TY LUẬT TNHH NGỌC SƠN & PARTNERS", { bold: true }),
    P("Đại diện: Luật sư điều hành · Website: luatngocson.com"),

    H("BÊN B — KHÁCH HÀNG"),
    P(m.org?.name ?? "Doanh nghiệp", { bold: true }),
    P(`Mã số thuế: ${m.org?.taxCode ?? "—"}    ·    Loại hình: ${m.org?.businessType ?? "—"}`),
    P(`Địa chỉ: ${m.org?.address ?? "—"}`),

    H("ĐIỀU 1. NỘI DUNG DỊCH VỤ"),
    P(`Bên A thực hiện dịch vụ Khảo sát Pháp lý Doanh nghiệp 360° cho Bên B theo gói "${pkg?.label ?? "—"}": rà soát có hệ thống các lĩnh vực pháp lý, ứng dụng công nghệ AI hỗ trợ phân loại tài liệu, và luật sư phụ trách phê duyệt kết luận cuối; bàn giao báo cáo khảo sát kèm lộ trình xử lý rủi ro 30-90 ngày.`),

    H("ĐIỀU 2. PHÍ DỊCH VỤ & THANH TOÁN"),
    P(`Phí dịch vụ: ${m.proposal ? VND.format(m.proposal.amount) : "—"}; VAT: ${m.proposal ? VND.format(m.proposal.vatAmount) : "—"}.`),
    P(`Tổng cộng: ${VND.format(total)} (đã gồm VAT).`, { bold: true }),
    P("Bên B thanh toán tạm ứng theo thông báo của Bên A; hồ sơ được mở chính thức sau khi Bên A xác nhận đã nhận thanh toán."),

    H("ĐIỀU 3. QUYỀN & NGHĨA VỤ CÁC BÊN"),
    P("Bên B cung cấp đầy đủ, trung thực tài liệu theo checklist. Bên A bảo mật thông tin, chỉ sử dụng cho mục đích khảo sát; mọi đánh giá pháp lý cuối cùng do luật sư phụ trách phê duyệt."),

    H("ĐIỀU 4. HIỆU LỰC & KÝ KẾT"),
    P("Hợp đồng có hiệu lực kể từ khi hai bên ký. Bên B có thể ký bằng chữ ký số (digital signature) trên bản PDF và tải lại lên cổng khách hàng để hoàn tất."),

    new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "" })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "ĐẠI DIỆN BÊN A                                        ĐẠI DIỆN BÊN B", bold: true })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "(Ký, ghi rõ họ tên)                                    (Ký số / ký tên, đóng dấu)", italics: true, size: 18 })] }),
  ];

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
