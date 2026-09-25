// lib/domain/imc.ts
//
// Dominio puro del IMC (R7): índice de masa corporal y categoría OMS para la
// ficha del alumno. Sin estado ni I/O — entradas numéricas, salida calculada
// o null; el llamador decide qué hacer con el resultado.

export type CategoriaImc = "bajo" | "normal" | "sobrepeso" | "obesidad";

/**
 * IMC = peso / (altura en metros)², redondeado a 1 decimal. Devuelve null si
 * no es calculable: cualquier entrada no finita o <= 0 (altura 0 incluida,
 * que evita la división por cero).
 */
export function imc(pesoKg: number, alturaCm: number): number | null {
  if (!Number.isFinite(pesoKg) || !Number.isFinite(alturaCm)) return null;
  if (pesoKg <= 0 || alturaCm <= 0) return null;
  const metros = alturaCm / 100;
  return Math.round((pesoKg / metros ** 2) * 10) / 10;
}

/**
 * Categoría OMS del IMC (R7): < 18.5 bajo · < 25 normal · < 30 sobrepeso ·
 * >= 30 obesidad.
 */
export function categoriaImc(valor: number): CategoriaImc {
  if (valor < 18.5) return "bajo";
  if (valor < 25) return "normal";
  if (valor < 30) return "sobrepeso";
  return "obesidad";
}
