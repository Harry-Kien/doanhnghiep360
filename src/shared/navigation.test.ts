import { describe, expect, it } from "vitest";
import { targetForRole } from "./navigation";

describe("role-based navigation", () => {
  it("keeps customer accounts inside the customer portal", () => {
    expect(targetForRole("customer", "/portal")).toBe("/portal");
    expect(targetForRole("customer", "/portal/documents")).toBe("/portal/documents");
    expect(targetForRole("customer", "/admin")).toBe("/portal");
    expect(targetForRole("customer", "/cases/case_1")).toBe("/portal");
  });

  it("keeps internal accounts out of the customer portal", () => {
    expect(targetForRole("admin", "/portal")).toBe("/admin");
    expect(targetForRole("admin", "/admin/settings")).toBe("/admin/settings");
    expect(targetForRole("intake", "/admin")).toBe("/intake");
    expect(targetForRole("accountant", "/ke-toan")).toBe("/ke-toan");
  });
});
