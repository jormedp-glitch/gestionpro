// e2e/a11y.spec.ts
//
// Auditoría WCAG automática (axe-core) de las pantallas principales.
//
// Qué cubre: violations WCAG 2.0/2.1 A y AA + las reglas de best-practice de
// axe (landmarks, headings, nombres accesibles) en claro Y en oscuro.
//
// Contexto: la auditoría manual del 2026-10-26 encontró 6 tipos de violación
// (button-name y label críticos; color-contrast, region, landmark-one-main y
// page-has-heading-one). Este spec las convierte en un gate: la app no vuelve
// a perder accesibilidad sin que el CI lo avise.
//
// Entorno: corre contra el sandbox (ver docs/sandbox.md), nunca contra
// producción. Las rutas se auditan con la sesión de E2E_TEST_EMAIL.

import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// axe-core se carga desde node_modules (dependencia explícita): se inyecta el
// script en la página para auditar el DOM real, no una copia.
const axeSource = readFileSync(
  resolve(process.cwd(), "node_modules/axe-core/axe.min.js"),
  "utf8",
);

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

const RUTAS = [
  "/login",
  "/",
  "/gym-el-oso",
  "/gym-el-oso?vista=alumnos",
  "/gym-el-oso?vista=rutinas",
  "/gym-el-oso?vista=cobros",
  "/gym-el-oso?vista=gastos",
  "/gym-el-oso/usuarios",
  "/qa-ana-profe",
  "/taller-eme",
  "/taller-eme/reparaciones",
  "/taller-eme/reparaciones/nuevo",
];

type Violacion = {
  id: string;
  impacto: string | null;
  ayuda: string;
  nodos: number;
  ejemplos: string[];
};

async function auditar(
  page: import("@playwright/test").Page,
  esquema: "light" | "dark",
) {
  await page.emulateMedia({ colorScheme: esquema });
  // Auditar con las animaciones desactivadas: `animate-pulse` (skeletons y
  // badges) anima la opacidad 1 → 0.5 → 1 y, a mitad de ciclo, el texto queda
  // al 50 % sobre su fondo: el contraste real baja de 4.5:1 y axe lo reporta
  // como violación de un estado transitorio que el usuario no llega a leer.
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
  await page.addScriptTag({ content: axeSource });
  const violaciones = await page.evaluate(async () => {
    const r = await (
      window as unknown as {
        axe: {
          run: (
            ctx: Document,
            opts: unknown,
          ) => Promise<{
            violations: Array<{
              id: string;
              impact: string | null;
              help: string;
              nodes: Array<{
                html: string;
                target: string[];
                failureSummary?: string;
              }>;
            }>;
          }>;
        };
      }
    ).axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
      },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impacto: v.impact,
      ayuda: v.help,
      nodos: v.nodes.length,
      ejemplos: v.nodes
        .slice(0, 3)
        .map(
          (n) =>
            `${n.target.join(" ")} → ${n.html.slice(0, 120)}\n        ${(
              n.failureSummary || ""
            )
              .split("\n")
              .slice(0, 2)
              .join(" ")}`,
        ),
    }));
  });
  return violaciones as Violacion[];
}

test.describe("Auditoría WCAG (axe)", () => {
  test("las pantallas principales no tienen violaciones WCAG", async ({
    page,
  }) => {
    // 12 rutas × 2 modos = 24 corridas de axe: el default de 30 s no alcanza.
    test.setTimeout(300_000);
    if (EMAIL && PASSWORD) {
      await page.goto("/login");
      await page.getByLabel("Email").fill(EMAIL);
      await page.getByLabel("Contraseña").fill(PASSWORD);
      await page.getByRole("button", { name: "Ingresar" }).click();
      await expect(page.getByText("Panel de administración")).toBeVisible();
    }

    const encontradas: string[] = [];
    for (const ruta of RUTAS) {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle").catch(() => {});
      // La app es client-heavy: tras la respuesta del servidor queda el
      // skeleton "Cargando..." (con animate-pulse al 50 %) hasta que hidrata.
      // Auditar ese estado da falsos positivos de contraste: hay que esperar
      // a que la UI real esté en pantalla.
      await page
        .waitForFunction(
          () => !document.body.innerText.includes("Cargando"),
          undefined,
          { timeout: 15_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(400);
      for (const esquema of ["light", "dark"] as const) {
        const violaciones = await auditar(page, esquema);
        for (const v of violaciones) {
          encontradas.push(
            `${ruta} [${esquema}] ${v.id} (${v.impacto}) x${v.nodos}: ${v.ayuda}` +
              (v.ejemplos.length
                ? `\n      ${v.ejemplos.join("\n      ")}`
                : ""),
          );
        }
      }
    }
    expect(
      encontradas,
      `violaciones de accesibilidad:\n  ${encontradas.join("\n  ")}`,
    ).toEqual([]);
  });
});
