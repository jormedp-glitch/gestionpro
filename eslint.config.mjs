import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Baseline-lint policy (D-1): legacy debt stays VISIBLE but non-blocking.
      // Fase 2 (architecture) removes the violations and flips these to error.
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // lint-staged config files are CommonJS by design (D-3).
    files: [".lintstagedrc.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "components/NegocioApp.tsx",
  ]),
]);
