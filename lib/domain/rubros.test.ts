// lib/domain/rubros.test.ts
//
// Tests del default de aviso por rubro (#179): el taller no avisa por defecto
// porque el turno es un compromiso interno; el resto de los rubros (y también
// cualquier rubro desconocido/legacy) sí avisan.
//
// Tests de esRubroGymCore (SDD rubro-profesor): el rubro `profesor` comparte
// el core de carga de datos con `gimnasio`; el resto de los rubros no.

import { describe, expect, it } from "vitest";
import { avisoTurnoPorDefecto, esRubroGymCore } from "./rubros";

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

describe("esRubroGymCore (SDD rubro-profesor: carga gym compartida)", () => {
  it("gimnasio y profesor cargan el core de gym", () => {
    expect(esRubroGymCore("gimnasio")).toBe(true);
    expect(esRubroGymCore("profesor")).toBe(true);
  });

  it("peluquería no carga el core de gym", () => {
    expect(esRubroGymCore("peluqueria")).toBe(false);
  });

  it("rubro desconocido u vacío no carga el core de gym", () => {
    expect(esRubroGymCore("restaurante")).toBe(false);
    expect(esRubroGymCore("")).toBe(false);
  });
});
