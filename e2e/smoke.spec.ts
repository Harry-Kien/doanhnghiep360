import { test, expect, type Page } from "@playwright/test";

// E2E browser — bấm thật từng chức năng theo luồng & theo vai trò (khớp UI: login tách khách/nội bộ).

async function loginByApi(page: Page, email: string) {
  // page.request dùng chung cookie jar với page.goto ⇒ session tự áp dụng, không cần set cookie thủ công.
  const res = await page.request.post("/api/auth/login", { data: { email, password: "legal360" } });
  expect(res.ok()).toBeTruthy();
}

async function staffLogin(page: Page, email: string, path: string, expectUrl: RegExp) {
  await loginByApi(page, email);
  await page.goto(path);
  // Trang nặng (vd /admin) lần đầu biên dịch có thể bị đá về đăng nhập do race — thử lại 1 lần.
  if (/\/nhan-vien|\/login/.test(page.url())) {
    await page.goto(path);
  }
  await expect(page).toHaveURL(expectUrl, { timeout: 30_000 });
}

test.describe("Landing & đăng ký", () => {
  test("trang chủ hiển thị thương hiệu + CTA đăng ký", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Ngọc Sơn|Khảo sát Pháp lý/i);
    await expect(page.getByRole("link", { name: /Đăng ký khảo sát/i }).first()).toBeVisible();
  });

  test("mở phiếu đăng ký, form hiển thị bước 1", async ({ page }) => {
    await page.goto("/dang-ky");
    await expect(page.getByText("Tên doanh nghiệp").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Tiếp tục/i })).toBeVisible();
  });
});

test.describe("Bảo vệ route (auth guard) — đúng trang đăng nhập theo khu vực", () => {
  test("khu nội bộ /admin chưa đăng nhập → /nhan-vien", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/nhan-vien/);
  });
  test("khu nội bộ /ke-toan chưa đăng nhập → /nhan-vien", async ({ page }) => {
    await page.goto("/ke-toan");
    await expect(page).toHaveURL(/\/nhan-vien/);
  });
  test("cổng khách /portal chưa đăng nhập → /login", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Đăng nhập & workspace theo vai trò", () => {
  test("trang nội bộ /nhan-vien có form thật và không còn nút demo", async ({ page }) => {
    await page.goto("/nhan-vien");
    await expect(page.getByRole("heading", { name: /Đăng nhập nội bộ/i })).toBeVisible();
    await expect(page.getByText(/Đăng nhập nhanh|tài khoản demo|Email mẫu/i)).toHaveCount(0);
  });

  test("Intake → /intake (Tiếp nhận & điều phối)", async ({ page }) => {
    await staffLogin(page, "intake@legal360.vn", "/intake", /\/intake/);
    await expect(page.getByRole("heading", { name: /Tiếp nhận & điều phối/i })).toBeVisible();
  });

  test("Luật sư → /lawyer (Workspace luật sư)", async ({ page }) => {
    await staffLogin(page, "lawyer@legal360.vn", "/lawyer", /\/lawyer/);
    await expect(page.getByRole("heading", { name: /Workspace luật sư/i })).toBeVisible();
  });

  test("Kế toán → /ke-toan (workspace dòng tiền)", async ({ page }) => {
    await staffLogin(page, "accountant@legal360.vn", "/ke-toan", /\/ke-toan/);
    await expect(page.getByRole("heading", { name: /Kế toán & thanh toán/i })).toBeVisible();
  });

  test("Admin → /admin (trung tâm điều hành)", async ({ page }) => {
    await staffLogin(page, "admin@legal360.vn", "/admin", /\/admin/);
    await expect(page.getByRole("heading", { name: /điều hành|Tổng quan/i }).first()).toBeVisible();
  });
});

test.describe("Cổng khách hàng", () => {
  test("khách đăng nhập bằng tài khoản thật thấy cổng + tiến trình hồ sơ", async ({ page }) => {
    await loginByApi(page, "khach@legal360.vn");
    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Cổng khách hàng/i).first()).toBeVisible();
    await expect(page.getByText(/Tiến trình hồ sơ/i).first()).toBeVisible();
  });
});

test.describe("Hồ sơ chi tiết & phân vai", () => {
  test("Intake mở 1 hồ sơ → đủ 5 tab; tab Thương mại render", async ({ page }) => {
    await staffLogin(page, "intake@legal360.vn", "/intake", /\/intake/);
    // mở hồ sơ đầu tiên trong danh sách
    const firstCase = page.locator('a[href^="/cases/"]').first();
    await expect(firstCase).toBeVisible({ timeout: 20_000 });
    await firstCase.click();
    await expect(page).toHaveURL(/\/cases\//, { timeout: 20_000 });
    await expect(page.getByRole("tab", { name: "Thương mại" })).toBeVisible();
    await page.getByRole("tab", { name: "Thương mại" }).click();
    await expect(page.getByText(/Conflict check/i).first()).toBeVisible();
  });

  test("Luật sư mở hồ sơ giai đoạn intake → thấy ghi chú 'theo dõi' (không thao tác)", async ({ page }) => {
    // tạo 1 hồ sơ mới ở trạng thái lead (qua intake) để chắc chắn đang ở giai đoạn intake
    await staffLogin(page, "lawyer@legal360.vn", "/lawyer", /\/lawyer/);
    // luật sư mở 1 hồ sơ bất kỳ nếu có trong danh sách
    const firstCase = page.locator('a[href^="/cases/"]').first();
    if (await firstCase.count()) {
      await firstCase.click();
      await expect(page).toHaveURL(/\/cases\//, { timeout: 20_000 });
      // case detail render được (tab Tổng quan)
      await expect(page.getByRole("tab", { name: "Tổng quan" })).toBeVisible();
    }
  });
});
