import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun e2e/mock-supabase-server.mjs",
      url: "http://127.0.0.1:8789/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command:
        "VITE_SUPABASE_URL=http://localhost:8080/__supabase SUPABASE_URL=http://127.0.0.1:8789 VITE_SUPABASE_PUBLISHABLE_KEY=e2e-key SUPABASE_PUBLISHABLE_KEY=e2e-key bun run dev",
      url: "http://localhost:8080",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
