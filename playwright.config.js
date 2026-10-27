// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'firebase emulators:start --only auth,firestore,functions,hosting',
    port: 5000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
};
