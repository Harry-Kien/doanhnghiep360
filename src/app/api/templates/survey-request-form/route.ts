import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const TEMPLATE_FILE = path.join(process.cwd(), "public", "templates", "mau-01-phieu-yeu-cau-khao-sat-doanh-nghiep-360.docx");

export async function GET() {
  try {
    const file = await readFile(TEMPLATE_FILE);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="Mau-01-Phieu-yeu-cau-khao-sat-doanh-nghiep-360.docx"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Không tìm thấy mẫu phiếu yêu cầu khảo sát." } },
      { status: 404 },
    );
  }
}
