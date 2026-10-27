import { defineConfig, devices } from "@playwright/test";

// 冒煙測試：只啟動 hosting 模擬器即可（login/setup 頁面不需後端）。
// 完整跨角色流程（主管建帳號→員工排休→主管編排）需先合併 firestore.rules，
// 並改用 `firebase emulators:start --only auth,firestore,functions,hosting`，
// 見 tests/e2e/full-flow.spec.js（預設 skip）。
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:5000",
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "firebase emulators:start --only hosting",
    url: "http://127.0.0.1:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
