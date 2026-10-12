import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
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
});
