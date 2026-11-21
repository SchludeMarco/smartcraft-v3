import { defineConfig, devices } from "@playwright/test";

// Kompletter Ablauf im echten Browser: Backend (Mock-KI, temporäre DB) + Vite-Dev-Server.
// Lokal ohne Playwright-Browser-Download: CHROME_PATH=/pfad/zu/chrome npm run e2e
const chromePath = process.env.CHROME_PATH;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    ...devices["Pixel 7"],
    launchOptions: chromePath
      ? { executablePath: chromePath, args: ["--no-proxy-server"] }
      : {},
  },
  webServer: [
    {
      command:
        "uv run uvicorn --factory smartcraft_api.main:create_app --port 8000",
      cwd: "../api",
      url: "http://localhost:8000/health",
      reuseExistingServer: false,
      env: {
        SMARTCRAFT_DATABASE_URL: "sqlite://",
        SMARTCRAFT_STORAGE_DIR: "/tmp/smartcraft-e2e-storage",
        SMARTCRAFT_ENVIRONMENT: "test",
      },
    },
    {
      command: "npx vite --port 5173 --strictPort",
      url: "http://localhost:5173",
      reuseExistingServer: false,
    },
  ],
});
