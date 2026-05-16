/**
 * Isolated eval runner — does not enforce coverage thresholds from root vitest.config.ts.
 * Run: npm run eval
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "eval",
    globals: true,
    environment: "node",
    include: ["eval/**/*.eval.ts"],
    setupFiles: [],
    testTimeout: 60_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "..", "src"),
    },
  },
});
