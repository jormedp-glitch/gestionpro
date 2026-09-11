// playwright.config.ts
//
// E2E smoke (fase5-ui P8, REQ-E2E-1): dos projects — desktop 1280×800 y
// mobile 390×844 — sobre el mismo smoke superficial (e2e/smoke.spec.ts,
// REQ-E2E-2). Playwright levanta `npm run dev` (CI) o reusa un server
// existente en local (E2E_BASE_URL).
//
// Seguridad: el smoke completo (login → crear negocio → turno) MUTA datos y
// solo corre con credenciales de un entorno de TEST (E2E_TEST_EMAIL /
// E2E_TEST_PASSWORD); sin ellas se omite y solo corre el test no destructivo
// de la ruta pública de seguimiento. Nunca apuntar contra el proyecto
// Supabase de producción (ver apply-progress fase5-ui P8).

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
