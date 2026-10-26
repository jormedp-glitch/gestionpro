// lib/domain/wa.ts
//
// Builder de deep link de WhatsApp unificado (spec R4). Normaliza el teléfono
// y construye el link con el texto pre-codificado. Reemplaza el patrón
// duplicado de los pages (wa.me/54${...} / wa.me/549${...}) por una única
// fuente.
//
// Por qué `api.whatsapp.com/send` y no `wa.me` (verificado 2026-10-26 con un
// browser real): el short link `wa.me/<tel>?text=...` **redirige** (302) a
// `api.whatsapp.com/send/`, y ese redirector re-codifica el parámetro `text`
// rompiendo los emojis: el 👋 llega como U+FFFD ("�"). Ir directo al
// endpoint de la API conserva el texto intacto (emoji incluido) y es el
// "click to chat" canónico que abre la app nativa en el celular.

/**
 * Normaliza un teléfono a solo dígitos con prefijo de país argentino:
 * - si ya inicia con "54" (54/549 existentes) se conserva tal cual;
 * - si no, se antepone "54".
 */
export function normalizarTelefono(tel: string): string {
  const soloDigitos = tel.replace(/\D/g, "");
  return soloDigitos.startsWith("54") ? soloDigitos : `54${soloDigitos}`;
}

/** Deep link de WhatsApp con el mensaje codificado (encodeURIComponent). */
export function buildWhatsAppLink(tel: string, msg: string): string {
  return `https://api.whatsapp.com/send/?phone=${normalizarTelefono(tel)}&text=${encodeURIComponent(msg)}`;
}
