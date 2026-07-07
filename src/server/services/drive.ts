// Tạo cấu trúc Google Drive cho hồ sơ (Phase 3, hoạt động với mock adapter).
// Drive lỗi ⇒ case vẫn tồn tại, drive_folders.status=drive_pending, có thể retry.
import { getDb, commit } from "@/server/db";
import { getDriveAdapter, DriveProviderError } from "@/server/adapters/drive";
import { DRIVE_SUBFOLDERS } from "@/shared/constants";
import { createId } from "@/lib/utils";
import { recordAudit } from "@/server/services/audit";
import type { DriveFolder } from "@/shared/types";

export interface ProvisionDriveResult {
  driveFolderId: string | null;
  status: "active" | "drive_pending";
  subfolders: number;
}

export async function provisionCaseDrive(
  caseId: string,
  actor: { id: string | null; label?: string },
): Promise<ProvisionDriveResult> {
  const db = getDb();
  const theCase = db.cases.find((c) => c.id === caseId);
  if (!theCase) throw new Error("NOT_FOUND");
  const org = db.organizations.find((o) => o.id === theCase.orgId);
  const folderName = `${theCase.caseCode ?? "DN-PENDING"}_${org?.slug ?? "CONG-TY"}`;

  const adapter = await getDriveAdapter();
  const now = new Date().toISOString();

  try {
    const root = await adapter.createCaseFolder(folderName);
    const rootRecord: DriveFolder = {
      id: createId("drv"),
      caseId,
      driveFolderId: root.driveFolderId,
      name: folderName,
      parentFolderId: null,
      subfolderKey: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    db.driveFolders.push(rootRecord);

    let created = 0;
    for (const sub of DRIVE_SUBFOLDERS) {
      const f = await adapter.createSubfolder(root.driveFolderId, sub.name);
      db.driveFolders.push({
        id: createId("drv"),
        caseId,
        driveFolderId: f.driveFolderId,
        name: sub.name,
        parentFolderId: root.driveFolderId,
        subfolderKey: sub.key,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }
    commit();
    recordAudit({
      actorId: actor.id,
      actorLabel: actor.label,
      action: "drive.provisioned",
      entityType: "case",
      entityId: caseId,
      metadata: { folderName, driveFolderId: root.driveFolderId, subfolders: created, provider: adapter.name },
    });
    return { driveFolderId: root.driveFolderId, status: "active", subfolders: created };
  } catch (err) {
    // Không rollback case. Ghi trạng thái drive_pending để retry.
    db.driveFolders.push({
      id: createId("drv"),
      caseId,
      driveFolderId: null,
      name: folderName,
      parentFolderId: null,
      subfolderKey: null,
      status: "drive_pending",
      createdAt: now,
      updatedAt: now,
    });
    commit();
    recordAudit({
      actorId: actor.id,
      actorLabel: actor.label,
      action: "drive.failed",
      entityType: "case",
      entityId: caseId,
      metadata: { folderName, error: err instanceof DriveProviderError ? err.message : "unknown" },
    });
    return { driveFolderId: null, status: "drive_pending", subfolders: 0 };
  }
}
