// lib/domain/ingresos.test.ts
//
// Red de seguridad del total cobrado del mes (issue #177): KPIs = plata
// realmente cobrada (tabla `cobros`). Cubre el filtro por mes, montos
// null/faltantes, lista vacía y montos string del shape crudo de la DB.
// Fechas fijas: sin dependencia de zona horaria.

import { describe, it, expect } from "vitest";
import { totalCobradoDelMes } from "./ingresos";

describe("totalCobradoDelMes", () => {
  it("suma solo los cobros del mes pedido", () => {
    const cobros = [
      { fecha: "2026-09-01", monto: 10000 },
      { fecha: "2026-09-30", monto: 37000 },
      { fecha: "2026-08-31", monto: 99999 }, // mes anterior: afuera
      { fecha: "2026-10-01", monto: 88888 }, // mes siguiente: afuera
    ];
    expect(totalCobradoDelMes(cobros, "2026-09")).toBe(47000);
  });

  it("monto null o undefined cuenta 0", () => {
    const cobros = [
      { fecha: "2026-09-05", monto: null },
      { fecha: "2026-09-06", monto: undefined },
      { fecha: "2026-09-07", monto: 2500 },
    ];
    expect(totalCobradoDelMes(cobros, "2026-09")).toBe(2500);
  });

  it("lista vacía → 0", () => {
    expect(totalCobradoDelMes([], "2026-09")).toBe(0);
  });

  it("monto string numérico se suma (shape crudo de la DB)", () => {
    const cobros = [
      { fecha: "2026-09-10", monto: "1500.50" },
      { fecha: "2026-09-11", monto: 500 },
    ];
    expect(totalCobradoDelMes(cobros, "2026-09")).toBe(2000.5);
  });
});
