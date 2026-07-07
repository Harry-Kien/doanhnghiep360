// OCR local: trích text THẬT từ DOCX (sinh bằng lib docx) — chứng minh pipeline đọc nội dung thật.
import { describe, it, expect } from "vitest";
import { LocalOcrAdapter } from "./index";

describe("LocalOcrAdapter (OCR thật)", () => {
  it("trích đúng text từ DOCX", async () => {
    const docx = await import("docx");
    const { Document, Packer, Paragraph, TextRun } = docx;
    const doc = new Document({
      sections: [{ children: [new Paragraph({ children: [new TextRun("Điều lệ công ty quy định về chuyển nhượng cổ phần.")] })] }],
    });
    const buf = Buffer.from(await Packer.toBuffer(doc));

    const ocr = new LocalOcrAdapter();
    const res = await ocr.extract({
      fileName: "dieu-le.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: buf,
    });
    expect(res.text).toContain("chuyển nhượng cổ phần");
    expect(res.confidence).toBeGreaterThan(0.5);
    expect(res.fields.detectedType).toBe("docx");
  });

  it("không có content ⇒ text rỗng, không lỗi", async () => {
    const ocr = new LocalOcrAdapter();
    const res = await ocr.extract({ fileName: "x.pdf", mimeType: "application/pdf" });
    expect(res.text).toBe("");
    expect(res.pages).toBe(0);
  });
});
