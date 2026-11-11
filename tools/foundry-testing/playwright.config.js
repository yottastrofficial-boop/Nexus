import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const authState = fileURLToPath(new URL("./.auth/storage-state.json", import.meta.url));
const hasAuthState = existsSync(authState);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: process.env.FOUNDRY_URL || "http://127.0.0.1:30000",
    browserName: "chromium",
    headless: process.env.HEADED !== "1",
    ignoreHTTPSErrors: true,
    ...(hasAuthState ? { storageState: authState } : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  }
});
