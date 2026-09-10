// e2e/smoke.spec.ts
//
// Smoke superficial de los flujos clave (fase5-ui P8, REQ-E2E-2):
//   login → crear negocio → turno → seguimiento
// sobre los 2 viewports del config (desktop 1280×800, mobile 390×844),
// verificando en cada paso cero errores de consola y cero overflow
// horizontal (escenario mobile de REQ-E2E-2).
//
// Entorno y seguridad (CRÍTICO):
// - El flujo completo MUTA datos (crea negocio + turno). Solo se ejecuta con
//   credenciales de un entorno de TEST (E2E_TEST_EMAIL / E2E_TEST_PASSWORD
//   apuntando a un proyecto Supabase de test). Sin credenciales el test se
//   omite con motivo; NUNCA correr contra producción (el `.env.local` local
//   apunta al proyecto real — el primer run real es en CI/PR batch).
// - El test de seguimiento público es NO destructivo: usa un token con
//   formato inválido que corta antes del RPC (D-11: formato UUID) y
//   renderiza el EmptyState "Enlace no válido" — corre siempre, sin
//   credenciales, y es el único e2e activo hoy.

import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;
const SIN_ENTORNO_DE_TEST = !EMAIL || !PASSWORD;

const NOMBRE_NEGOCIO = `E2E Smoke ${Date.now()}`;
const SLUG_NEGOCIO = `e2e-smoke-${Date.now()}`;

/** Recoge errores de consola y pageerrors del navegador durante el test. */
function trackErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errores.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errores.push(`pageerror: ${err.message}`));
  return errores;
}

/** REQ-E2E-2: sin overflow horizontal (tolerancia 1px por redondeo). */
async function sinOverflowHorizontal(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth - clientWidth,
    `overflow horizontal (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`,
  ).toBeLessThanOrEqual(1);
}

async function pasoLimpio(page: Page, errores: string[], paso: string) {
  expect(errores, `errores de consola en "${paso}"`).toEqual([]);
  await sinOverflowHorizontal(page);
}

test.describe("Smoke flujos clave (REQ-E2E-2)", () => {
  test("login → crear negocio → turno → seguimiento", async ({ page }) => {
    test.skip(
      SIN_ENTORNO_DE_TEST,
      "sin entorno de test (E2E_TEST_EMAIL/E2E_TEST_PASSWORD): el flujo muta datos; correr solo contra un proyecto Supabase de test (primer run real en CI/PR batch, REQ-E2E-3)",
    );

    const email = EMAIL ?? "";
    const password = PASSWORD ?? "";
    const errores = trackErrores(page);
    // El alta de turno abre WhatsApp (window.open): se cierra el popup para
    // no navegar; el destino wa.me no es parte del smoke.
    page.on("popup", (popup) => void popup.close());

    // 1. Login (Server Action; redirige a /)
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Panel de administración")).toBeVisible();
    await pasoLimpio(page, errores, "login");

    // 2. Crear negocio (RPC crear_negocio_con_owner + router.refresh)
    await page.getByPlaceholder("Nombre del negocio").fill(NOMBRE_NEGOCIO);
    await page.getByPlaceholder("slug (ej: gym-el-oso)").fill(SLUG_NEGOCIO);
    await page.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText(`/${SLUG_NEGOCIO}`)).toBeVisible();
    await pasoLimpio(page, errores, "crear negocio");

    // 3. Turno (tab Agenda → modal → Server Action crearTurno → toast)
    await page.goto(`/${SLUG_NEGOCIO}`);
    await page.getByRole("button", { name: "📅 Agenda" }).click();
    await page.getByRole("button", { name: "+ Nuevo turno" }).first().click();
    await page
      .getByPlaceholder("Nombre del cliente")
      .fill(`Cliente ${Date.now()}`);
    await page.getByPlaceholder("Teléfono (WhatsApp)").fill("11 5555 5555");
    await page.getByPlaceholder("Servicio").fill("Smoke e2e");
    await page.getByRole("combobox", { name: "Hora" }).click();
    await page.getByRole("option", { name: "10:00", exact: true }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Turno creado ✓")).toBeVisible();
    await pasoLimpio(page, errores, "turno");

    // 4. Seguimiento (ruta PÚBLICA; token inválido → EmptyState, sin datos)
    await page.goto(`/${SLUG_NEGOCIO}/seguimiento/1?token=token-invalido`);
    await expect(page.getByText("Enlace no válido")).toBeVisible();
    await pasoLimpio(page, errores, "seguimiento");
  });

  test("seguimiento público sin sesión renderiza sin overflow ni errores (no destructivo)", async ({
    page,
  }) => {
    const errores = trackErrores(page);
    await page.goto("/e2e-smoke/seguimiento/1?token=no-es-un-uuid");
    await expect(page.getByText("Enlace no válido")).toBeVisible();
    await pasoLimpio(page, errores, "seguimiento público");
  });
});
