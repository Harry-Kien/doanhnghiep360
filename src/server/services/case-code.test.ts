import { describe, it, expect, beforeEach } from "vitest";
import { generateCaseCode } from "./case-code";
import { __resetStore } from "@/server/db/store";

describe("generateCaseCode", () => {
  beforeEach(() => __resetStore());

  it("đúng định dạng DN-YYYYMMDD-00001", () => {
    const code = generateCaseCode(new Date(2026, 5, 18));
    expect(code).toMatch(/^DN-\d{8}-\d{5}$/);
    expect(code).toBe("DN-20260618-00001");
  });

  it("sinh 1000 mã liên tiếp không trùng", () => {
    const date = new Date(2026, 5, 18);
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(generateCaseCode(date));
    expect(set.size).toBe(1000);
  });

  it("counter reset theo ngày", () => {
    const a = generateCaseCode(new Date(2026, 5, 18));
    const b = generateCaseCode(new Date(2026, 5, 19));
    expect(a).toBe("DN-20260618-00001");
    expect(b).toBe("DN-20260619-00001");
  });
});
