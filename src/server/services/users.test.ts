import { describe, it, expect, beforeEach } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { listStaffUsers, createStaffUser, updateStaffUser, UserAdminError } from "./users";

const admin = { id: "admin-actor", label: "Admin" };
// Lưu ý: getDb() tự seed lại — luôn có sẵn 1 admin (admin@legal360.vn) + 1 customer (khach@demo.vn).

describe("Quản lý người dùng nội bộ", () => {
  beforeEach(() => __resetStore());

  it("tạo tài khoản nhân sự hợp lệ + view không lộ passwordHash", () => {
    const u = createStaffUser({ email: "ls.a@ngocson.vn", fullName: "Luật sư A", role: "lawyer", password: "matkhau123" }, admin);
    expect(u.role).toBe("lawyer");
    expect(u.isActive).toBe(true);
    expect("passwordHash" in u).toBe(false);
    expect(getDb().users.find((x) => x.id === u.id)!.passwordHash).toBeTruthy();
  });

  it("chặn email trùng (không phân biệt hoa thường)", () => {
    createStaffUser({ email: "trung@ngocson.vn", fullName: "Anh Trung", role: "staff", password: "matkhau123" }, admin);
    expect(() => createStaffUser({ email: "TRUNG@ngocson.vn", fullName: "Bình", role: "intake", password: "matkhau123" }, admin)).toThrow(UserAdminError);
  });

  it("chặn vai trò không hợp lệ (customer) và mật khẩu ngắn", () => {
    expect(() => createStaffUser({ email: "x@y.vn", fullName: "X", role: "customer", password: "matkhau123" }, admin)).toThrow(UserAdminError);
    expect(() => createStaffUser({ email: "x2@y.vn", fullName: "X", role: "staff", password: "123" }, admin)).toThrow(UserAdminError);
  });

  it("đổi vai trò + khóa/mở + đặt lại mật khẩu", () => {
    const u = createStaffUser({ email: "z@ngocson.vn", fullName: "Zeta", role: "staff", password: "matkhau123" }, admin);
    expect(updateStaffUser(u.id, { role: "lawyer" }, admin).role).toBe("lawyer");
    expect(updateStaffUser(u.id, { isActive: false }, admin).isActive).toBe(false);
    const oldHash = getDb().users.find((x) => x.id === u.id)!.passwordHash;
    updateStaffUser(u.id, { password: "matkhaumoi9" }, admin);
    expect(getDb().users.find((x) => x.id === u.id)!.passwordHash).not.toBe(oldHash);
  });

  it("không cho tự khóa chính mình", () => {
    // tạo 1 admin mới (đã có admin seed ⇒ không phải admin cuối) rồi tự khóa
    const me = createStaffUser({ email: "me@ngocson.vn", fullName: "Me", role: "admin", password: "matkhau123" }, admin);
    expect(() => updateStaffUser(me.id, { isActive: false }, { id: me.id, label: "Me" })).toThrow(UserAdminError);
  });

  it("không cho khóa/hạ admin CUỐI CÙNG (admin seed)", () => {
    const seededAdmin = getDb().users.find((u) => u.role === "admin" && u.isActive)!;
    expect(() => updateStaffUser(seededAdmin.id, { isActive: false }, { id: "other" })).toThrow(UserAdminError);
    expect(() => updateStaffUser(seededAdmin.id, { role: "staff" }, { id: "other" })).toThrow(UserAdminError);
  });

  it("listStaffUsers không gồm khách hàng", () => {
    expect(listStaffUsers().some((u) => u.role === "customer")).toBe(false);
    expect(listStaffUsers().some((u) => u.role === "admin")).toBe(true);
  });
});
