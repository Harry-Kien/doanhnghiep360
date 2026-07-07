// Điểm truy cập database: đảm bảo đã seed trước khi dùng.
import { rawDb, commit, __resetStore } from "@/server/db/store";
import { ensureSeeded } from "@/server/services/seed";
import type { Database } from "@/server/db/store";

export function getDb(): Database {
  ensureSeeded();
  return rawDb();
}

export { commit, __resetStore };
export type { Database };
