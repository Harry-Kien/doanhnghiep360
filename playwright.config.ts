import { defineConfig, devices } from "@playwright/test";

// E2E browser smoke. Tự khởi động Next dev trên cổng 3100 (reuse nếu đã chạy).
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE,
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
