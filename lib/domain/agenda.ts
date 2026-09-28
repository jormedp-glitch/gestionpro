// lib/domain/agenda.ts
//
// Ventana de planificación del dashboard (issue #187): próximos 7 días de
// turnos agrupados por día. Dominio puro y determinista, con la misma
// convención de fechas que lib/domain/cuotas.ts: strings YYYY-MM-DD,
// matemática en UTC (sin corrimientos de zona horaria) y `hoy` inyectado por
// el caller — nada de Date.now() interno.

/** Días que cubre la ventana por defecto del dashboard (hoy incluido). */
const DIAS_VENTANA = 7;

const MS_POR_DIA = 86_400_000;

/** Nombres de día en español, indexados por getUTCDay() (0 = domingo). */
const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

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

/** Suma días a una fecha YYYY-MM-DD; null si la base no es una fecha real. */
function sumarDias(fecha: string, dias: number): string | null {
  const base = aDiasUTC(fecha);
  return base === null ? null : aFechaISO(base + dias);
}

/**
 * Etiqueta del grupo de un día: "Hoy", "Mañana" o "Miércoles 30/09".
 * Una fecha inválida se muestra tal cual (no hay día de semana calculable).
 */
function etiquetaDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  const dias = aDiasUTC(fecha);
  if (dias === null) return fecha;
  const nombre = DIAS_SEMANA[new Date(dias * MS_POR_DIA).getUTCDay()];
  return `${nombre} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/**
 * Turnos dentro de la ventana [hoy, hoy + dias - 1] (comparación de strings
 * YYYY-MM-DD, sin timezone), ordenados por fecha y luego por hora. Con `hoy`
 * inválido no hay ventana calculable: devuelve [] (mismo criterio defensivo
 * que las cuotas). No muta la entrada.
 */
export function proximosTurnos<T extends { fecha: string; hora: string }>(
  turnos: readonly T[],
  hoy: string,
  dias = DIAS_VENTANA,
): T[] {
  const fin = sumarDias(hoy, dias - 1);
  if (fin === null) return [];
  return [...turnos]
    .filter((t) => t.fecha >= hoy && t.fecha <= fin)
    .sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora),
    );
}

/**
 * Agrupa los turnos por fecha presente, con los grupos en orden ascendente.
 * Conserva el orden interno de cada grupo (el caller ya los ordena por hora
 * con `proximosTurnos`). La etiqueta de cada grupo sale de `etiquetaDia`.
 */
export function agruparTurnosPorDia<T extends { fecha: string }>(
  turnos: readonly T[],
  hoy: string,
): Array<{ fecha: string; etiqueta: string; turnos: T[] }> {
  const porFecha = new Map<string, T[]>();
  for (const turno of turnos) {
    const grupo = porFecha.get(turno.fecha);
    if (grupo) {
      grupo.push(turno);
    } else {
      porFecha.set(turno.fecha, [turno]);
    }
  }
  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, turnosDelDia]) => ({
      fecha,
      etiqueta: etiquetaDia(fecha, hoy),
      turnos: turnosDelDia,
    }));
}
