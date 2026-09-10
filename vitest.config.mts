import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/domain/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/domain/**"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      reporter: ["text", "json-summary"],
      reportOnFailure: true,
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
