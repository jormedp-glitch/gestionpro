// lib/domain/imc.test.ts
//
// Red de seguridad del dominio IMC (R7): cálculo con redondeo a 1 decimal,
// entradas no calculables (cero, negativas, no finitas) y los cuatro límites
// de la categoría OMS.

import { describe, it, expect } from "vitest";
import { categoriaImc, imc, type CategoriaImc } from "./imc";

describe("imc", () => {
  const casos: Array<[number, number, number | null]> = [
    [70, 175, 22.9],
    [80, 180, 24.7],
    [50, 160, 19.5],
    [95, 170, 32.9],
    [0, 175, null], // peso 0 no es calculable
    [-5, 175, null], // peso negativo
    [70, 0, null], // altura 0: evita la división por cero
    [70, -10, null], // altura negativa
    [NaN, 175, null], // peso no finito
    [70, NaN, null], // altura no finita
    [Infinity, 175, null],
    [70, Infinity, null],
  ];

  it.each(casos)("imc(%j, %j) → %j", (peso, altura, esperado) => {
    expect(imc(peso, altura)).toBe(esperado);
  });

  it("no expone la precisión cruda de la división", () => {
    // 70 / 1.75² = 22.857142857142858 en punto flotante.
    expect(imc(70, 175)).not.toBe(22.857142857142858);
  });
});

describe("categoriaImc", () => {
  const casos: Array<[number, CategoriaImc]> = [
    [10, "bajo"],
    [18.4, "bajo"], // límite superior de "bajo"
    [18.5, "normal"], // límite inferior de "normal"
    [24.9, "normal"], // límite superior de "normal"
    [25, "sobrepeso"], // límite inferior de "sobrepeso"
    [29.9, "sobrepeso"], // límite superior de "sobrepeso"
    [30, "obesidad"], // límite inferior de "obesidad"
    [45, "obesidad"],
  ];

  it.each(casos)("categoriaImc(%j) → %s", (valor, esperado) => {
    expect(categoriaImc(valor)).toBe(esperado);
  });

  it("es coherente con el IMC calculado de un caso real", () => {
    expect(categoriaImc(imc(70, 175)!)).toBe("normal");
  });
});
