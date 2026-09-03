// lib/domain/wa.ts
//
// Builder wa.me unificado (spec R4). Normaliza el teléfono y construye el
// deep link con el texto pre-codificado. Reemplaza el patrón duplicado de
// los pages (wa.me/54${...} / wa.me/549${...}) por una única fuente.

/**
 * Normaliza un teléfono a solo dígitos con prefijo de país argentino:
 * - si ya inicia con "54" (54/549 existentes) se conserva tal cual;
 * - si no, se antepone "54".
 */
export function normalizarTelefono(tel: string): string {
  const soloDigitos = tel.replace(/\D/g, "");
  return soloDigitos.startsWith("54") ? soloDigitos : `54${soloDigitos}`;
}

/** Deep link wa.me con el mensaje codificado (encodeURIComponent). */
export function buildWhatsAppLink(tel: string, msg: string): string {
  return `https://wa.me/${normalizarTelefono(tel)}?text=${encodeURIComponent(msg)}`;
}
