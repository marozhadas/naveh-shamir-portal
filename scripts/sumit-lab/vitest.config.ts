import { defineConfig } from "vitest/config";
import path from "node:path";

/** Runner for the LOCAL SUMIT test lab only: `npm run sumit:lab`. The normal `npm test` never includes scripts/. */
export default defineConfig({
  root: path.resolve(__dirname, "..", ".."),
  test: {
    environment: "node",
    include: ["scripts/sumit-lab/*.lab.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "..", "..", "src"),
      "server-only": path.resolve(__dirname, "stubs", "server-only.ts"),
    },
  },
});
