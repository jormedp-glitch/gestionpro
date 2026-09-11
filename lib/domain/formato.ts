// lib/domain/formato.ts
//
// Formatos de dinero (ARS) y fechas en español argentino. Extraídos de los
// helpers inline duplicados en los pages (spec R4 / plan maestro Fase 2):
// el comportamiento de salida se conserva tal cual.

/** Monto en pesos argentinos: `$1.234` (toLocaleString es-AR). */
export function formatARS(n: number): string {
  return `$${Number(n || 0).toLocaleString("es-AR")}`;
}

/** Fecha ISO (yyyy-mm-dd o datetime) a dd/mm/aaaa. Vacío si no hay fecha. */
export function formatFecha(iso: string): string {
  if (!iso) return "";
  const [y, m, dd] = iso.split("T")[0].split("-");
  return `${dd}/${m}/${y}`;
}

/** Fecha+ hora es-AR: dd/mm/aaaa hh:mm (mismo formato que la vista seguimiento). */
export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
