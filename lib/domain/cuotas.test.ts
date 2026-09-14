// lib/domain/cuotas.test.ts
//
// Red de seguridad del estado derivado por vencimiento (issue #78): cubre los
// tres estados, los límites de 7 días, null/vacío/inválido y el avance de un
// mes con clamp de fin de mes y cruce de año. Fechas fijas: sin dependencia TZ.

import { describe, it, expect } from "vitest";
import {
  estadoPorVencimiento,
  proximoVencimiento,
  type EstadoCuota,
} from "./cuotas";

const HOY = "2026-09-14";

describe("estadoPorVencimiento", () => {
  const casos: Array<[string | null | undefined, EstadoCuota]> = [
    ["2026-09-13", "vencido"], // ayer
    ["2026-04-06", "vencido"], // evidencia QA: meses vencido
    ["2026-09-14", "vence_pronto"], // vence hoy (límite inferior)
    ["2026-09-21", "vence_pronto"], // hoy + 7 (límite superior)
    ["2026-09-22", "activo"], // hoy + 8
    ["2027-01-01", "activo"], // futuro lejano
    [null, "activo"],
    [undefined, "activo"],
    ["", "activo"],
    ["no-es-fecha", "activo"], // inválida: no inventa alertas
    ["2026-02-30", "activo"], // fecha imposible (falla el round-trip UTC)
  ];

  it.each(casos)("vence %j con hoy 2026-09-14 → %s", (vence, esperado) => {
    expect(estadoPorVencimiento(vence, HOY)).toBe(esperado);
  });

  it("sin `hoy` válido devuelve activo (no hay diff calculable)", () => {
    expect(estadoPorVencimiento("2026-04-06", "")).toBe("activo");
  });

  it("cubre el cruce de año en ambos sentidos", () => {
    expect(estadoPorVencimiento("2025-12-31", "2026-01-01")).toBe("vencido");
    expect(estadoPorVencimiento("2026-01-01", "2025-12-31")).toBe(
      "vence_pronto",
    );
  });

  it("un mes calendario con 31 días no adelanta el límite de 7", () => {
    // 2026-10-01 vs 2026-09-24: 7 días exactos → vence_pronto; +1 → activo.
    expect(estadoPorVencimiento("2026-10-01", "2026-09-24")).toBe(
      "vence_pronto",
    );
    expect(estadoPorVencimiento("2026-10-02", "2026-09-24")).toBe("activo");
  });
});

describe("proximoVencimiento", () => {
  const casos: Array<[string | null | undefined, string]> = [
    ["2026-04-06", "2026-10-14"], // vencido → hoy + 1 mes
    ["2026-09-13", "2026-10-14"], // vencido (ayer) → hoy + 1 mes
    [null, "2026-10-14"], // sin vence → hoy + 1 mes
    [undefined, "2026-10-14"],
    ["", "2026-10-14"],
    ["2026-09-14", "2026-10-14"], // vence hoy → un mes desde vence
    ["2026-09-21", "2026-10-21"], // futuro → un mes desde vence
  ];

  it.each(casos)("vence %j con hoy 2026-09-14 → %s", (vence, esperado) => {
    expect(proximoVencimiento(vence, HOY)).toBe(esperado);
  });

  it("clamp de fin de mes: 31/01 → 28/02 (no bisiesto)", () => {
    expect(proximoVencimiento("2026-01-31", "2026-01-01")).toBe("2026-02-28");
  });

  it("clamp de fin de mes: 31/01 → 29/02 (bisiesto)", () => {
    expect(proximoVencimiento("2028-01-31", "2028-01-01")).toBe("2028-02-29");
  });

  it("clamp de fin de mes: 31/08 → 30/09", () => {
    expect(proximoVencimiento("2026-08-31", "2026-08-01")).toBe("2026-09-30");
  });

  it("cruce de año: 15/12 → 15/01 del año siguiente", () => {
    expect(proximoVencimiento("2026-12-15", "2026-12-01")).toBe("2027-01-15");
  });

  it("cruce de año con clamp: 31/12 → 31/01 del año siguiente", () => {
    expect(proximoVencimiento("2026-12-31", "2026-12-01")).toBe("2027-01-31");
  });

  it("vence inválido se trata como null: hoy + 1 mes", () => {
    expect(proximoVencimiento("31/01/2026", HOY)).toBe("2026-10-14");
    expect(proximoVencimiento("2026-02-30", HOY)).toBe("2026-10-14");
  });

  it("sin `hoy` válido devuelve el mismo valor sin calcular", () => {
    expect(proximoVencimiento("2026-01-31", "no-es-fecha")).toBe("no-es-fecha");
  });

  it("siempre devuelve YYYY-MM-DD", () => {
    expect(proximoVencimiento("2026-01-31", "2026-01-15")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("tras pagar un vencido, el próximo vence deriva en activo", () => {
    const proximo = proximoVencimiento("2026-04-06", HOY);
    expect(estadoPorVencimiento(proximo, HOY)).toBe("activo");
  });
});
