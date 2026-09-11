import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_RUBRO, RUBRO_ACCENT, accentPorRubro } from "./theme";

// Vitest corre desde la raíz del repo; process.cwd() es estable en node y jsdom.
const globalsCss = readFileSync(
  resolve(process.cwd(), "app/globals.css"),
  "utf8",
);

describe("RUBRO_ACCENT (espejo de tokens)", () => {
  it("define los 4 rubros del dominio", () => {
    expect(Object.keys(RUBRO_ACCENT).sort()).toEqual([
      "gimnasio",
      "peluqueria",
      "servicio_tecnico",
      "veterinaria",
    ]);
  });

  it("cada acento coincide con --accent declarado en globals.css (sync)", () => {
    for (const [rubro, color] of Object.entries(RUBRO_ACCENT)) {
      const block = globalsCss.match(
        new RegExp(`html\\[data-rubro="${rubro}"\\]\\s*\\{[^}]*\\}`, "i"),
      );
      expect(block, `bloque html[data-rubro="${rubro}"]`).not.toBeNull();
      expect(block?.[0].toLowerCase()).toContain(
        `--accent: ${color.toLowerCase()}`,
      );
    }
  });

  it("mapea @theme inline a las vars (bg-background / text-accent resuelven)", () => {
    expect(globalsCss).toContain("--color-background: var(--background)");
    expect(globalsCss).toContain("--color-accent: var(--accent)");
  });

  it("no conserva el bloque dark del mundo anterior", () => {
    expect(globalsCss.toLowerCase()).not.toContain("prefers-color-scheme");
  });
});

describe("accentPorRubro", () => {
  it("devuelve el acento del rubro", () => {
    expect(accentPorRubro("veterinaria")).toBe(RUBRO_ACCENT.veterinaria);
    expect(accentPorRubro("peluqueria")).toBe(RUBRO_ACCENT.peluqueria);
    expect(accentPorRubro("gimnasio")).toBe(RUBRO_ACCENT.gimnasio);
  });

  it("cae al default ante rubro desconocido", () => {
    expect(accentPorRubro("restaurante")).toBe(RUBRO_ACCENT[DEFAULT_RUBRO]);
  });
});
