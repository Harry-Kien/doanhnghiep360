import path from "node:path";
import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { GET } from "./route";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "mau-01-phieu-yeu-cau-khao-sat-doanh-nghiep-360.docx");

describe("GET /api/templates/survey-request-form", () => {
  it("trả file DOCX Mẫu 01 với header tải xuống đúng", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(res.headers.get("content-disposition")).toContain("Mau-01-Phieu-yeu-cau-khao-sat-doanh-nghiep-360.docx");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(10_000);
  });

  it("template public là bản trống, không còn dữ liệu Houston/demo", async () => {
    const { value } = await mammoth.extractRawText({ path: TEMPLATE_PATH });

    expect(value).toContain("PHIẾU YÊU CẦU");
    expect(value).toContain("KHẢO SÁT DOANH NGHIỆP");
    expect(value.toLowerCase()).not.toContain("houston");
    expect(value).not.toContain("3702469447");
    expect(value).not.toContain("LÊ VŨ HOÀNG LÂN");
  });
});
