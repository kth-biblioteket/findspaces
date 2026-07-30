import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
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
      command: "node e2e/fixtures/mock-supabase.mjs",
      url: "http://127.0.0.1:8080/health",
      reuseExistingServer: false,
      timeout: 30_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 1_000 },
      env: {
        E2E_SUPABASE_PORT: "8080",
        E2E_APP_PORT: "8787",
      },
    },
    {
      command: "node e2e/fixtures/start-built-app.mjs",
      url: "http://127.0.0.1:8787",
      reuseExistingServer: false,
      timeout: 120_000,
      gracefulShutdown: { signal: "SIGINT", timeout: 1_000 },
      env: {
        VITE_SUPABASE_URL: "http://localhost:8080",
        VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-publishable-key",
      },
    },
  ],
});
