import { describe, it, expect, vi, afterEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { rawDb } from "@/server/db/store";

describe("Seed theo môi trường", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    __resetStore();
  });

  it("PRODUCTION: chỉ tạo 1 admin master, KHÔNG hồ sơ mẫu / tài khoản demo", () => {
    vi.stubEnv("NODE_ENV", "production");
    __resetStore();
    const db = getDb();
    const staff = db.users.filter((u) => u.role !== "customer");
    expect(staff).toHaveLength(1);
    expect(staff[0].role).toBe("admin");
    expect(staff[0].fullName).toBe("Ths-Ls. Lý Ngọc Sơn");
    expect(db.users.some((u) => u.role === "customer")).toBe(false);
    expect(db.cases).toHaveLength(0);
  });

  it("DEV/TEST: seed đầy đủ demo (có hồ sơ + đủ vai trò) để chạy thử", () => {
    __resetStore();
    const db = getDb();
    expect(db.cases.length).toBeGreaterThan(0);
    expect(db.users.some((u) => u.role === "lawyer")).toBe(true);
  });

  it("LOCAL next start: APP_BASE_URL localhost van dong bo tai khoan seed test", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    __resetStore();
    const db = getDb();
    expect(db.users.some((u) => u.email === "khach@legal360.vn")).toBe(true);
    expect(db.cases.length).toBeGreaterThan(0);
  });

  it("DEV/TEST: seed doi ngu chinh sach va khong lo ten demo tren tai khoan noi bo", () => {
    __resetStore();
    const db = getDb();
    const names = db.users.map((u) => u.fullName);

    expect(names).toEqual(
      expect.arrayContaining([
        "Ths-Ls. Lý Ngọc Sơn",
        "Ls. Trần Văn Thuận",
        "Ls. Thân Thị Thu Phương",
        "Ls. Phạm Xuân Thành",
        "Ls. Nguyễn Thị Thu Hạnh",
        "Ls. Nguyễn Thành Tuấn",
        "Ls. Nguyễn Thị An Huyền",
        "Ths. Nguyễn Phan Ngọc Trâm",
      ]),
    );
    expect(names.join(" ")).not.toMatch(/Demo|Nguyễn Quản Trị|Partner giả|Partner gia|Công ty Demo/i);
  });

  it("chuan hoa DB cu da seeded neu con tai khoan noi bo ten demo", () => {
    __resetStore();
    const db = rawDb();
    db.meta.seeded = true;
    db.users.push({
      id: "usr_old_admin",
      email: "admin@legal360.vn",
      fullName: "Nguyễn Quản Trị",
      role: "admin",
      passwordHash: null,
      orgId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    db.users.push({
      id: "usr_old_customer",
      email: "khach@demo.vn",
      fullName: "Công ty Demo (KH)",
      role: "customer",
      passwordHash: null,
      orgId: "org_old",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const normalized = getDb();

    expect(normalized.users[0].fullName).toBe("Ths-Ls. Lý Ngọc Sơn");
    const customer = normalized.users.find((u) => u.email === "khach@legal360.vn");
    expect(customer?.fullName).toBe("Công ty CP Giáo dục Houston123");
    expect(customer?.passwordHash).toEqual(expect.any(String));
  });
});
