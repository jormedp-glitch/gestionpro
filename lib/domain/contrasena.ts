// lib/domain/contrasena.ts
//
// Generación de contraseña temporal para el alta de usuarios (fase 6, R1).
// Dominio puro y testeable: la fuente de aleatoriedad se inyecta por parámetro
// (default: crypto.randomInt) para que los tests puedan forzar secuencias
// deterministas; la función no toca I/O, estado global ni Date.now().

import { randomInt } from "node:crypto";

/**
 * Longitud por defecto de la contraseña temporal. El requisito es ≥ 8; 12
 * equilibra entropía y comodidad de tipeo al copiarla a WhatsApp.
 */
export const LARGO_CONTRASENA = 12;

/**
 * Charset sin caracteres ambiguos: se excluyen 0/O, 1/l/I (y las minúsculas
 * o/i que compiten con sus mayúsculas). 55 caracteres → ≈46 bits de entropía
 * con el largo por defecto.
 */
export const CHARSET_CONTRASENA =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Fuente de aleatoriedad: devuelve un entero en [0, max). */
export type RandomSource = (max: number) => number;

const randomIntDefault: RandomSource = (max) => randomInt(max);

/**
 * Contraseña temporal de `LARGO_CONTRASENA` caracteres del charset sin
 * ambiguos. Con la fuente default cada llamada devuelve una secuencia distinta
 * (crypto.randomInt); inyectar una fuente determinista permite probar el
 * algoritmo sin aleatoriedad real.
 */
export function generarContrasenaTemporal(
  random: RandomSource = randomIntDefault,
): string {
  let contrasena = "";
  for (let i = 0; i < LARGO_CONTRASENA; i++) {
    contrasena += CHARSET_CONTRASENA[random(CHARSET_CONTRASENA.length)];
  }
  return contrasena;
}
