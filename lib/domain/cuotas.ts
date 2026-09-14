// lib/domain/cuotas.ts
//
// Reglas de vencimiento de cuotas (issue #78). Dominio puro y determinista:
// fechas YYYY-MM-DD, matemática en UTC (sin corrimientos de zona horaria) y
// `hoy` siempre inyectado por el caller — nada de Date.now() interno.
//
// El estado del cliente NO se lee de la columna `estado`: se deriva del
// `vence` al leer (features/clientes/data/clientes.ts), fuente única para
// badges, KPIs y alertas de cobro.

export type EstadoCuota = "activo" | "vence_pronto" | "vencido";

/** Días (inclusive) a partir de los cuales el vencimiento es "pronto". */
const DIAS_VENCE_PRONTO = 7;

const MS_POR_DIA = 86_400_000;

/** Convierte YYYY-MM-DD a días desde epoch UTC; null si no es una fecha real. */
function aDiasUTC(fecha: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!match) return null;
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const ms = Date.UTC(anio, mes - 1, dia);
  const fechaUTC = new Date(ms);
  // Round-trip: descarta fechas imposibles (p. ej. 2026-02-30).
  if (
    fechaUTC.getUTCFullYear() !== anio ||
    fechaUTC.getUTCMonth() !== mes - 1 ||
    fechaUTC.getUTCDate() !== dia
  ) {
    return null;
  }
  return ms / MS_POR_DIA;
}

/** Formatea días desde epoch UTC como YYYY-MM-DD. */
function aFechaISO(dias: number): string {
  const fecha = new Date(dias * MS_POR_DIA);
  const anio = String(fecha.getUTCFullYear()).padStart(4, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Suma 1 mes con clamp de fin de mes (31/01 → 28/02 o 29/02 bisiesto). */
function sumarUnMes(dias: number): number {
  const fecha = new Date(dias * MS_POR_DIA);
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth();
  const dia = fecha.getUTCDate();
  // Día 0 del mes siguiente al destino = último día del mes destino.
  const ultimoDiaDestino = new Date(Date.UTC(anio, mes + 2, 0)).getUTCDate();
  return Date.UTC(anio, mes + 1, Math.min(dia, ultimoDiaDestino)) / MS_POR_DIA;
}

/**
 * Estado derivado del vencimiento (regla acordada 2026-09-14):
 * "vencido" si ya pasó · "vence_pronto" si vence en ≤ 7 días (incluye hoy) ·
 * "activo" si falta más de 7 días. `vence` null, vacío o inválido → "activo".
 */
export function estadoPorVencimiento(
  vence: string | null | undefined,
  hoy: string,
): EstadoCuota {
  const diasVence = aDiasUTC(vence ?? "");
  const diasHoy = aDiasUTC(hoy);
  if (diasVence === null || diasHoy === null) return "activo";
  const diferencia = diasVence - diasHoy;
  if (diferencia < 0) return "vencido";
  if (diferencia <= DIAS_VENCE_PRONTO) return "vence_pronto";
  return "activo";
}

/**
 * Próximo vencimiento al registrar el pago: si el `vence` ya pasó (o es
 * null/vacío/inválido) → hoy + 1 mes; si no → un mes más desde el `vence`
 * actual. Siempre con clamp de fin de mes y cruce de año natural.
 */
export function proximoVencimiento(
  vence: string | null | undefined,
  hoy: string,
): string {
  const diasHoy = aDiasUTC(hoy);
  // Sin ancla válida no hay cálculo posible: se devuelve `hoy` sin cambios.
  if (diasHoy === null) return hoy;
  const diasVence = aDiasUTC(vence ?? "");
  const base = diasVence === null || diasVence < diasHoy ? diasHoy : diasVence;
  return aFechaISO(sumarUnMes(base));
}
