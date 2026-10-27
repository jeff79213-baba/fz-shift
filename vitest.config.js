import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.js", "functions/__tests__/**/*.test.js"], environment: "node" },
});
