// lib/domain/contrasena.test.ts
//
// Red de seguridad de la contraseña temporal (fase 6, R1): longitud ≥ 8,
// charset sin ambiguos, unicidad entre llamadas y el algoritmo con fuente
// determinista inyectada (path completo sin aleatoriedad real).

import { describe, it, expect } from "vitest";
import {
  CHARSET_CONTRASENA,
  LARGO_CONTRASENA,
  generarContrasenaTemporal,
} from "./contrasena";

const AMBIGUOS = ["0", "O", "1", "l", "I"];

describe("generarContrasenaTemporal", () => {
  it("devuelve la longitud por defecto, que cumple el mínimo de 8", () => {
    expect(LARGO_CONTRASENA).toBeGreaterThanOrEqual(8);
    expect(generarContrasenaTemporal()).toHaveLength(LARGO_CONTRASENA);
  });

  it("solo usa caracteres del charset sin ambiguos", () => {
    const contrasena = generarContrasenaTemporal();
    for (const caracter of contrasena) {
      expect(CHARSET_CONTRASENA).toContain(caracter);
    }
  });

  it("el charset no contiene caracteres ambiguos (0/O, 1/l/I)", () => {
    for (const ambiguo of AMBIGUOS) {
      expect(CHARSET_CONTRASENA).not.toContain(ambiguo);
    }
  });

  it("llamadas sucesivas con la fuente default difieren (unicidad)", () => {
    const generadas = new Set(
      Array.from({ length: 100 }, () => generarContrasenaTemporal()),
    );
    expect(generadas.size).toBe(100);
  });

  it("con una fuente determinista inyectada genera la secuencia esperada", () => {
    let indice = 0;
    const random = (max: number) => indice++ % max;
    const esperada = Array.from(
      { length: LARGO_CONTRASENA },
      (_, i) => CHARSET_CONTRASENA[i % CHARSET_CONTRASENA.length],
    ).join("");
    expect(generarContrasenaTemporal(random)).toBe(esperada);
  });

  it("es pura: con la misma fuente determinista repite el mismo resultado", () => {
    const fuenteFija = () => 3;
    expect(generarContrasenaTemporal(fuenteFija)).toBe(
      generarContrasenaTemporal(fuenteFija),
    );
    expect(generarContrasenaTemporal(fuenteFija)).toBe(
      CHARSET_CONTRASENA[3].repeat(LARGO_CONTRASENA),
    );
  });
});
