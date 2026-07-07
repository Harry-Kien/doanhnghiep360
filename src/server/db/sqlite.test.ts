// Chứng minh SQLite backend bền vững: ghi -> đóng -> mở lại -> dữ liệu còn nguyên (atomic, qua restart).
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqlite } from "./sqlite";
import { emptyDb } from "./store";

const FILE = path.join(os.tmpdir(), "legal360-sqlite-test", "test.db");

function wipe(): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(`${FILE}${suffix}`, { force: true });
    } catch {
      /* ignore */
    }
  }
}

describe("SQLite backend (durability)", () => {
  beforeEach(() => wipe());

  it("một DB mới là rỗng", () => {
    const b = openSqlite(FILE);
    expect(b.isEmpty()).toBe(true);
    b.close();
  });

  it("persist rồi mở lại (mô phỏng restart) giữ nguyên rows + counters + meta", () => {
    const b1 = openSqlite(FILE);
    const db = b1.load(emptyDb());
    db.users.push({
      id: "u1",
      email: "a@b.vn",
      fullName: "Người A",
      role: "admin",
      phone: null,
      passwordHash: null,
      isActive: true,
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
    } as never);
    db.cases.push({ id: "c1", caseId: undefined, orgId: "o1", status: "lead_new" } as never);
    db.documents.push({ id: "d1", caseId: "c1", originalName: "a.pdf" } as never);
    db.caseCodeCounters["20260620"] = 3;
    db.meta.seeded = true;
    b1.persist(db);
    b1.close();

    const b2 = openSqlite(FILE);
    expect(b2.isEmpty()).toBe(false);
    const db2 = b2.load(emptyDb());
    expect(db2.users).toHaveLength(1);
    expect(db2.users[0].email).toBe("a@b.vn");
    expect(db2.documents.filter((d) => d.caseId === "c1")).toHaveLength(1);
    expect(db2.caseCodeCounters["20260620"]).toBe(3);
    expect(db2.meta.seeded).toBe(true);
    b2.close();
  });

  it("persist là replace toàn bộ (không nhân đôi row qua nhiều lần ghi)", () => {
    const b = openSqlite(FILE);
    const db = b.load(emptyDb());
    db.users.push({ id: "u1", email: "x@y.vn", fullName: "X", role: "staff" } as never);
    b.persist(db);
    b.persist(db);
    b.persist(db);
    const reloaded = b.load(emptyDb());
    expect(reloaded.users).toHaveLength(1);
    b.close();
  });
});
