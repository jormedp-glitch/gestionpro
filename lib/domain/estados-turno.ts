// lib/domain/estados-turno.ts
//
// Estados del turno (issue #190 · ABM de la agenda). Viven en turnos.estado
// (text en la DB, sin migración): confirmado, completado, cancelado y
// no_asistio. El color comunica el estado de un vistazo y es la única fuente
// para la agenda y el resumen del dashboard (mismo criterio que
// lib/domain/estados-reparacion.ts).

export const ESTADOS_TURNO: Record<string, string> = {
  confirmado: "text-accent",
  completado: "text-emerald-400",
  cancelado: "text-muted-foreground",
  no_asistio: "text-amber-400",
};

/** Clase de color del estado; desconocido o null cae a muted. */
export function claseEstadoTurno(estado: string | null): string {
  return (estado && ESTADOS_TURNO[estado]) || "text-muted-foreground";
}
