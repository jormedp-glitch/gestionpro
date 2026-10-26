import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RUBRO,
  RUBRO_ACCENT,
  RUBRO_ICON,
  accentPorRubro,
  iconoRubro,
} from "./theme";

// Vitest corre desde la raíz del repo; process.cwd() es estable en node y jsdom.
const globalsCss = readFileSync(
  resolve(process.cwd(), "app/globals.css"),
  "utf8",
);

describe("RUBRO_ACCENT (espejo de tokens)", () => {
  it("define los 5 rubros del dominio (SDD rubro-profesor: + profesor)", () => {
    expect(Object.keys(RUBRO_ACCENT).sort()).toEqual([
      "gimnasio",
      "peluqueria",
      "profesor",
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

  it("define dark mode automático con tokens oscuros (prefers-color-scheme)", () => {
    // Dark mode implementado el 2026-10-01 (follow-up de fase5-ui: los tokens
    // estaban dark-ready). Reemplaza al guard que excluía el bloque dark del
    // mundo anterior.
    const darkBlock = globalsCss.match(
      /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\}/i,
    );
    expect(
      darkBlock,
      "bloque @media (prefers-color-scheme: dark)",
    ).not.toBeNull();
    const block = darkBlock?.[0] ?? "";
    expect(block).toContain("--background: #0a0a0a");
    expect(block).toContain("--card:");
    expect(block).toContain("--muted:");
    expect(block).toContain("--border:");
    expect(block).toContain("color-scheme: dark");
  });
});

describe("accentPorRubro", () => {
  it("devuelve el acento del rubro", () => {
    expect(accentPorRubro("veterinaria")).toBe(RUBRO_ACCENT.veterinaria);
    expect(accentPorRubro("peluqueria")).toBe(RUBRO_ACCENT.peluqueria);
    expect(accentPorRubro("gimnasio")).toBe(RUBRO_ACCENT.gimnasio);
  });

  it("acento del rubro profesor: #F472B6 (rosa)", () => {
    expect(accentPorRubro("profesor")).toBe("#F472B6");
  });

  it("cae al default ante rubro desconocido", () => {
    expect(accentPorRubro("restaurante")).toBe(RUBRO_ACCENT[DEFAULT_RUBRO]);
  });
});

describe("RUBRO_ICON (fuente unica de iconos)", () => {
  it("define un icono para cada rubro del dominio (sync con RUBRO_ACCENT)", () => {
    // Issue #205: el panel de administracion tenia su propio mapa de iconos y
    // quedo sin la rama `profesor` -> los negocios de profesor se listaban sin
    // icono. Este test ata los dos mapas para que el proximo rubro no repita
    // el bug.
    expect(Object.keys(RUBRO_ICON).sort()).toEqual(
      Object.keys(RUBRO_ACCENT).sort(),
    );
    for (const [rubro, icono] of Object.entries(RUBRO_ICON)) {
      expect(icono.trim(), `icono de ${rubro}`).not.toBe("");
    }
  });

  it("devuelve el icono del rubro", () => {
    expect(iconoRubro("veterinaria")).toBe(RUBRO_ICON.veterinaria);
    expect(iconoRubro("peluqueria")).toBe(RUBRO_ICON.peluqueria);
    expect(iconoRubro("gimnasio")).toBe(RUBRO_ICON.gimnasio);
    expect(iconoRubro("servicio_tecnico")).toBe(RUBRO_ICON.servicio_tecnico);
  });

  it("icono del rubro profesor: 🏃 (runner)", () => {
    expect(iconoRubro("profesor")).toBe("🏃");
  });

  it("cae al default ante rubro desconocido (nunca queda sin icono)", () => {
    // El valor legacy `reparaciones` del seed viejo y cualquier rubro
    // desconocido muestran el default en vez de un hueco en la UI.
    expect(iconoRubro("restaurante")).toBe(RUBRO_ICON[DEFAULT_RUBRO]);
    expect(iconoRubro("reparaciones")).toBe(RUBRO_ICON[DEFAULT_RUBRO]);
  });

  it("el panel de administracion consume el mapa compartido (sin copia local)", () => {
    // Issue #205: `app/page.tsx` declaraba su propio `rubroIcon` y quedo
    // desincronizado con el shell. Este meta-test falla si alguien vuelve a
    // duplicar el mapa en el panel.
    const panel = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");
    expect(panel).toContain('from "@/lib/ui/theme"');
    expect(panel).toMatch(/iconoRubro\(n\.rubro\)/);
    expect(panel).not.toMatch(/const\s+rubroIcon\b/);
  });
});
