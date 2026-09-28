// lib/domain/rubros.test.ts
//
// Tests del default de aviso por rubro (#179): el taller no avisa por defecto
// porque el turno es un compromiso interno; el resto de los rubros (y también
// cualquier rubro desconocido/legacy) sí avisan.

import { describe, expect, it } from "vitest";
import { avisoTurnoPorDefecto } from "./rubros";

describe("avisoTurnoPorDefecto", () => {
  it("servicio_tecnico: el turno es compromiso interno, no se avisa", () => {
    expect(avisoTurnoPorDefecto("servicio_tecnico")).toBe(false);
  });

  it("gimnasio, peluqueria y veterinaria avisan por defecto", () => {
    expect(avisoTurnoPorDefecto("gimnasio")).toBe(true);
    expect(avisoTurnoPorDefecto("peluqueria")).toBe(true);
    expect(avisoTurnoPorDefecto("veterinaria")).toBe(true);
  });

  it("rubro desconocido o legacy cae al default permisivo (true)", () => {
    expect(avisoTurnoPorDefecto("restaurante")).toBe(true);
    expect(avisoTurnoPorDefecto("")).toBe(true);
  });
});
