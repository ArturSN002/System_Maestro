const { defineConfig } = require("@playwright/test");

const port = process.env.MAESTRO_QA_PORT || "4000";
const baseURL = process.env.MAESTRO_BASE_URL || `http://127.0.0.1:${port}/System_Maestro/`;

module.exports = defineConfig({
  testDir: "./tests/playwright",
  timeout: 30000,
  expect: { timeout: 7000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: process.env.MAESTRO_SKIP_WEB_SERVER === "1" ? undefined : {
    command: `node tests/serve-static.js ${port} _site /System_Maestro`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000
  }
});
