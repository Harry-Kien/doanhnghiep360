import { describe, it, expect } from "vitest";
import { surveyRequestSchema } from "./schemas";

const valid = {
  companyName: "Công ty CP ABC",
  scope: ["corporate", "labor"],
  contactName: "Nguyễn Văn A",
  email: "a@abc.vn",
  phone: "0903123456",
  consent: true,
};

describe("surveyRequestSchema", () => {
  it("chấp nhận dữ liệu hợp lệ", () => {
    const r = surveyRequestSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("chặn khi thiếu email", () => {
    const r = surveyRequestSchema.safeParse({ ...valid, email: "" });
    expect(r.success).toBe(false);
  });

  it("chặn khi thiếu số điện thoại", () => {
    const r = surveyRequestSchema.safeParse({ ...valid, phone: "" });
    expect(r.success).toBe(false);
  });

  it("chặn khi chưa đồng ý xử lý dữ liệu", () => {
    const r = surveyRequestSchema.safeParse({ ...valid, consent: false });
    expect(r.success).toBe(false);
  });

  it("chặn email sai định dạng", () => {
    const r = surveyRequestSchema.safeParse({ ...valid, email: "khong-phai-email" });
    expect(r.success).toBe(false);
  });

  it("chặn SĐT sai định dạng", () => {
    const r = surveyRequestSchema.safeParse({ ...valid, phone: "12" });
    expect(r.success).toBe(false);
  });

  it("yêu cầu chọn ít nhất một phạm vi khảo sát", () => {
    const r = surveyRequestSchema.safeParse({ ...valid, scope: [] });
    expect(r.success).toBe(false);
  });

  it("chặn MST sai định dạng", () => {
    const r = surveyRequestSchema.safeParse({ ...valid, taxCode: "abc" });
    expect(r.success).toBe(false);
  });
});
