import { defineConfig, devices } from "@playwright/test";

const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const localPort = 3000;
const localBaseURL = `http://127.0.0.1:${localPort}`;
const baseURL = remoteBaseURL || localBaseURL;
const isRemote = Boolean(remoteBaseURL);

export default defineConfig({
  testDir: "./testing/e2e",
  fullyParallel: !process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "html",
  use: {
    baseURL,
    // Staging uses Caddy `tls internal`; LAN clients accept the warning once, CI must skip verify.
    ignoreHTTPSErrors: isRemote,
    trace: "on-first-retry"
  },
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: `npm run dev -- --host 127.0.0.1 --port ${localPort}`,
          url: localBaseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        }
      }),
  projects: process.env.CI
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] }
        }
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] }
        },
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] }
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] }
        }
      ]
});
