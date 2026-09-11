import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Alias "@/*" (tsconfig paths) para que vitest resuelva imports de app/ y
  // components/ (p. ej. los tests de estados de framework, P4).
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["lib/domain/**/*.test.ts", "proxy.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: [
            "lib/ui/**/*.test.{ts,tsx}",
            "features/**/*.test.{ts,tsx}",
            "components/**/*.test.{ts,tsx}",
          ],
          setupFiles: ["vitest.setup.ts"],
        },
      },
    ],
    // Cobertura ROOT (D6): Vitest 5 trata coverage como NonProjectOption;
    // los thresholds por glob exigen >=80 tanto en lib/domain como en lib/ui.
    coverage: {
      provider: "v8",
      include: ["lib/domain/**", "lib/ui/**"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
      reporter: ["text", "json-summary"],
      reportOnFailure: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        "lib/domain/**": {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        "lib/ui/**": {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
});
