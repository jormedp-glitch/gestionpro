// lib/domain/formato.test.ts
//
// Red de seguridad aditiva sobre formatos ARS y fechas (REQ-DT-9).
// Assert regex donde el formato ICU varía por entorno (sin dependencia TZ).

import { describe, it, expect } from "vitest";
import { formatARS, formatFecha, formatFechaHora } from "./formato";

describe("formatARS", () => {
  it("formatea montos positivos con separador de miles", () => {
    expect(formatARS(1234)).toBe("$1.234");
  });

  it("formatea cero sin separadores", () => {
    expect(formatARS(0)).toBe("$0");
  });

  it("conserva el signo negativo anteponiendo $ (regex, no string exacto)", () => {
    expect(formatARS(-500)).toMatch(/^\$-?\d/);
    expect(formatARS(-500)).toContain("-");
  });
});

describe("formatFecha", () => {
  it.each([
    ["2026-09-03", "03/09/2026"], // fecha ISO
    ["2026-09-03T10:30:00", "03/09/2026"], // datetime ISO (descarta hora)
  ])("formatFecha(%j) → %s", (entrada, esperado) => {
    expect(formatFecha(entrada)).toBe(esperado);
  });

  it("devuelve vacío cuando no hay fecha", () => {
    expect(formatFecha("")).toBe("");
  });
});

describe("formatFechaHora", () => {
  it("devuelve dd/mm/aaaa hh:mm es-AR (regex, sin dependencia TZ)", () => {
    const salida = formatFechaHora("2026-09-03T10:30:00");
    expect(salida).toMatch(/^\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/);
    expect(salida).toContain("03/09/2026");
    expect(salida).toContain("10:30");
  });
});
