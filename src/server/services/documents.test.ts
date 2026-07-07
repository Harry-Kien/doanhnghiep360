import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetStore, getDb } from "@/server/db";
import { createLeadFromSurvey } from "./leads";
import { provisionCaseDrive } from "./drive";
import { addDocument, listDocuments, countByCategory, deleteDocument, DocumentValidationError, DocumentAccessError, MAX_SIZE_BYTES } from "./documents";
import { MockDriveAdapter } from "@/server/adapters/drive/mock";
import { INTERNAL_ONLY_KEYS, CUSTOMER_UPLOAD_KEYS, SURVEY_REQUEST_FORM_CATEGORY } from "@/shared/constants";

const lead = {
  companyName: "Cong ty Doc Test",
  scope: ["corporate"] as string[],
  preferredMode: "either" as const,
  contactName: "Nguoi Doc",
  email: "doc@test.vn",
  phone: "0900000444",
  consent: true as const,
};
const actor = { id: "staff-1", label: "Chuyên viên" };

describe("document upload validation & metadata", () => {
  beforeEach(() => __resetStore());

  it("upload hợp lệ ⇒ tạo record có metadata + drive_file_id + đổi tên", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const doc = await addDocument(caseId, { categoryKey: "02", originalName: "GCN DKDN.pdf", mimeType: "application/pdf", sizeBytes: 500_000 }, actor);
    expect(doc.driveFileId).toBeTruthy();
    expect(doc.uploaderId).toBe("staff-1");
    expect(doc.categoryKey).toBe("02");
    expect(doc.storedName).toMatch(/_02_/); // tên file gắn nhóm tài liệu
    expect(listDocuments(caseId)).toHaveLength(1);
  });

  it("chặn file sai định dạng (mime ngoài whitelist)", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await expect(
      addDocument(caseId, { categoryKey: "02", originalName: "x.exe", mimeType: "application/x-msdownload", sizeBytes: 100 }, actor),
    ).rejects.toBeInstanceOf(DocumentValidationError);
  });

  it("chặn file quá dung lượng (>25MB)", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await expect(
      addDocument(caseId, { categoryKey: "02", originalName: "big.pdf", mimeType: "application/pdf", sizeBytes: MAX_SIZE_BYTES + 1 }, actor),
    ).rejects.toBeInstanceOf(DocumentValidationError);
  });

  it("chặn nhóm tài liệu không hợp lệ", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await expect(
      addDocument(caseId, { categoryKey: "ZZ", originalName: "a.pdf", mimeType: "application/pdf", sizeBytes: 100 }, actor),
    ).rejects.toBeInstanceOf(DocumentValidationError);
  });
});

describe("phân quyền nhóm tài liệu theo vai trò", () => {
  beforeEach(() => __resetStore());
  const customer = { id: "cust-1", label: "Khách hàng", role: "customer" as const };
  const staff = { id: "staff-1", label: "Chuyên viên", role: "staff" as const };

  it("khách hàng upload được các nhóm tài liệu dành cho khách", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    for (const key of CUSTOMER_UPLOAD_KEYS) {
      const doc = await addDocument(caseId, { categoryKey: key, originalName: "f.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, customer);
      expect(doc.categoryKey).toBe(key);
    }
    expect(listDocuments(caseId)).toHaveLength(CUSTOMER_UPLOAD_KEYS.length);
  });

  it("khách hàng KHÔNG upload được nhóm nội bộ (00, 09, 10, 99)", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    expect(INTERNAL_ONLY_KEYS).toEqual(expect.arrayContaining(["00", "09", "10", "99"]));
    for (const key of INTERNAL_ONLY_KEYS) {
      await expect(
        addDocument(caseId, { categoryKey: key, originalName: "x.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, customer),
      ).rejects.toBeInstanceOf(DocumentValidationError);
    }
    expect(listDocuments(caseId)).toHaveLength(0);
  });

  it("nội bộ (staff) upload được nhóm nội bộ 00/10", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const doc = await addDocument(caseId, { categoryKey: "00", originalName: "hopdong.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, staff);
    expect(doc.categoryKey).toBe("00");
  });

  it("phiếu yêu cầu khảo sát là nhóm khách được phép upload và bắt buộc theo checklist", () => {
    expect(CUSTOMER_UPLOAD_KEYS).toContain(SURVEY_REQUEST_FORM_CATEGORY.key);
    expect(SURVEY_REQUEST_FORM_CATEGORY.required).toBe(true);
  });

  it("khách upload phiếu yêu cầu khảo sát DOCX/PDF ⇒ ghi audit riêng và chuyển sang đã nhận phiếu", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const db = getDb();
    expect(db.cases.find((c) => c.id === caseId)?.status).toBe("lead_new");

    const doc = await addDocument(
      caseId,
      {
        categoryKey: SURVEY_REQUEST_FORM_CATEGORY.key,
        originalName: "Mau-01-da-dien.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 10,
        content: Buffer.from("docx-bytes"),
      },
      customer,
    );

    expect(doc.categoryKey).toBe(SURVEY_REQUEST_FORM_CATEGORY.key);
    expect(doc.storedName).not.toContain("DN-PENDING");
    expect(db.cases.find((c) => c.id === caseId)?.caseCode).toMatch(/^DN-\d{8}-\d{5}$/);
    expect(
      db.driveFolders.some(
        (folder) => folder.caseId === caseId && folder.subfolderKey === SURVEY_REQUEST_FORM_CATEGORY.key && folder.status === "active",
      ),
    ).toBe(true);
    expect(db.cases.find((c) => c.id === caseId)?.status).toBe("info_form_uploaded");
    expect(db.auditLogs.some((log) => log.action === "customer.uploaded_survey_request_form" && log.entityId === doc.id)).toBe(true);
    expect(
      db.caseStatusHistory.some(
        (entry) => entry.caseId === caseId && entry.toStatus === "info_form_uploaded" && entry.note?.includes("phiếu yêu cầu khảo sát"),
      ),
    ).toBe(true);
  });

  it("phiếu yêu cầu khảo sát chỉ nhận DOCX hoặc PDF, không nhận ảnh/DOC cũ", async () => {
    const { caseId } = createLeadFromSurvey(lead);

    await expect(
      addDocument(
        caseId,
        { categoryKey: SURVEY_REQUEST_FORM_CATEGORY.key, originalName: "anh.png", mimeType: "image/png", sizeBytes: 8, content: Buffer.from("89504e470d0a1a0a", "hex") },
        customer,
      ),
    ).rejects.toBeInstanceOf(DocumentValidationError);

    await expect(
      addDocument(caseId, { categoryKey: SURVEY_REQUEST_FORM_CATEGORY.key, originalName: "mau-01.doc", mimeType: "application/msword", sizeBytes: 1000 }, customer),
    ).rejects.toBeInstanceOf(DocumentValidationError);

    const pdf = await addDocument(
      caseId,
      { categoryKey: SURVEY_REQUEST_FORM_CATEGORY.key, originalName: "mau-01.pdf", mimeType: "application/pdf", sizeBytes: 9, content: Buffer.from("%PDF-1.4\n") },
      customer,
    );
    expect(pdf.mimeType).toBe("application/pdf");
  });
});

describe("upload lưu đúng case folder + subfolder, và đếm checklist", () => {
  beforeEach(() => __resetStore());
  const actor = { id: "staff-1", label: "Chuyên viên" };

  it("upload categoryKey=03 ⇒ gọi adapter với đúng driveFolderId của subfolder 03", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await provisionCaseDrive(caseId, actor);
    const sub03 = getDb().driveFolders.find((f) => f.caseId === caseId && f.subfolderKey === "03");
    expect(sub03?.driveFolderId).toBeTruthy();

    const spy = vi.spyOn(MockDriveAdapter.prototype, "uploadFile");
    await addDocument(caseId, { categoryKey: "03", originalName: "BCTC.pdf", mimeType: "application/pdf", sizeBytes: 2000 }, actor);
    // Đối số đầu tiên = driveFolderId của subfolder 03 ⇒ file vào đúng nhóm.
    expect(spy.mock.calls[0]?.[0]).toBe(sub03!.driveFolderId);
    expect(spy.mock.calls[0]?.[1]).toMatch(/_03_/); // tên file chuẩn hóa gắn categoryKey
    spy.mockRestore();
  });

  it("countByCategory đếm đúng số tệp theo từng nhóm", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await addDocument(caseId, { categoryKey: "01", originalName: "a.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, actor);
    await addDocument(caseId, { categoryKey: "01", originalName: "b.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, actor);
    await addDocument(caseId, { categoryKey: "03", originalName: "c.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, actor);
    const count = countByCategory(caseId);
    expect(count["01"]).toBe(2);
    expect(count["03"]).toBe(1);
    expect(count["02"]).toBeUndefined();
  });
});

describe("gỡ tài liệu up nhầm (deleteDocument)", () => {
  beforeEach(() => __resetStore());
  const customer = { id: "cust-1", label: "Khách hàng", role: "customer" as const };
  const otherCustomer = { id: "cust-2", label: "Khách khác", role: "customer" as const };
  const staff = { id: "staff-1", label: "Chuyên viên", role: "staff" as const };

  function setCaseStatus(caseId: string, status: string) {
    const c = getDb().cases.find((x) => x.id === caseId)!;
    c.status = status as typeof c.status;
  }

  it("khách gỡ được file của mình ⇒ xóa Drive, tombstone, count giảm", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    setCaseStatus(caseId, "waiting_documents");
    const doc = await addDocument(caseId, { categoryKey: "02", originalName: "nham.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, customer);
    const originalDriveId = doc.driveFileId; // lưu trước vì deleteDocument sẽ set null
    expect(countByCategory(caseId)["02"]).toBe(1);

    const spy = vi.spyOn(MockDriveAdapter.prototype, "deleteFile");
    const res = await deleteDocument(caseId, doc.id, customer);
    expect(res.id).toBe(doc.id);
    expect(spy).toHaveBeenCalledWith(originalDriveId);
    spy.mockRestore();

    expect(listDocuments(caseId)).toHaveLength(0); // tombstone bị loại khỏi danh sách
    expect(countByCategory(caseId)["02"]).toBeUndefined();
    const raw = getDb().documents.find((d) => d.id === doc.id)!;
    expect(raw.status).toBe("deleted"); // vẫn còn dấu vết audit
    expect(raw.driveFileId).toBeNull();
  });

  it("khách KHÔNG gỡ được file do người khác tải lên", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    setCaseStatus(caseId, "waiting_documents");
    const doc = await addDocument(caseId, { categoryKey: "02", originalName: "cua-nguoi-khac.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, otherCustomer);
    await expect(deleteDocument(caseId, doc.id, customer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listDocuments(caseId)).toHaveLength(1);
  });

  it("khách KHÔNG gỡ được tài liệu nhóm nội bộ (do staff tải)", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    setCaseStatus(caseId, "waiting_documents");
    const doc = await addDocument(caseId, { categoryKey: "00", originalName: "hopdong.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, staff);
    await expect(deleteDocument(caseId, doc.id, customer)).rejects.toBeInstanceOf(DocumentAccessError);
  });

  it("khách KHÔNG gỡ được khi hồ sơ đã qua giai đoạn nộp tài liệu", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    setCaseStatus(caseId, "waiting_documents");
    const doc = await addDocument(caseId, { categoryKey: "02", originalName: "x.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, customer);
    setCaseStatus(caseId, "delivered");
    await expect(deleteDocument(caseId, doc.id, customer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listDocuments(caseId)).toHaveLength(1);
  });

  it("nội bộ (staff) gỡ được tài liệu trong hồ sơ", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    const doc = await addDocument(caseId, { categoryKey: "02", originalName: "y.pdf", mimeType: "application/pdf", sizeBytes: 1000 }, staff);
    const res = await deleteDocument(caseId, doc.id, staff);
    expect(res.id).toBe(doc.id);
    expect(listDocuments(caseId)).toHaveLength(0);
  });

  it("gỡ tài liệu không tồn tại ⇒ NOT_FOUND", async () => {
    const { caseId } = createLeadFromSurvey(lead);
    await expect(deleteDocument(caseId, "doc_khong_co", staff)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
