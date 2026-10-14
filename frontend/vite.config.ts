import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

function assertProductionApiUrl() {
  const apiUrl = process.env.VITE_API_URL?.trim() ?? "";
  if (!apiUrl) {
    throw new Error(
      "VITE_API_URL is required for production builds. Example: https://api.example.com/api"
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error(`VITE_API_URL is not a valid URL: ${apiUrl}`);
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
    throw new Error("VITE_API_URL must not point at localhost in a production build");
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === "build" && mode === "production") {
    assertProductionApiUrl();
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./testing/unit/setup.ts",
      include: ["testing/unit/**/*.{test,spec}.{ts,tsx}"],
      css: true
    }
  };
});
