// lib/domain/estados-reparacion.ts
//
// Única fuente de la máquina de estados de reparaciones (spec R1).
// Todo código nuevo debe importar desde acá — nada de listas duplicadas.
//
// - ESTADOS: unifica etiqueta + color (template lib/types-reparaciones) e
//   icono (vista seguimiento) en un solo registro canónico (9 estados).
// - TRANSICIONES: mapa estado → destinos permitidos. D-05 adoptada:
//   `sin_reparacion` es TERMINAL (nunca transiciona a `entregado`).
// - ORDEN_FLUJO: 8 pasos del flujo ideal; incluye esperando_aprobacion y
//   aprobado (corrige el bug de las listas locales que omitían ambos y
//   producían indexActual = -1 en la vista de seguimiento).

export type EstadoReparacion =
  | "recibido"
  | "en_diagnostico"
  | "presupuesto_enviado"
  | "esperando_aprobacion"
  | "aprobado"
  | "en_reparacion"
  | "listo_para_retirar"
  | "entregado"
  | "sin_reparacion";

export interface EstadoInfo {
  valor: EstadoReparacion;
  etiqueta: string;
  color: string;
  icono: string;
}

export const ESTADOS: EstadoInfo[] = [
  {
    valor: "recibido",
    etiqueta: "Recibido",
    color: "bg-gray-100 text-gray-700",
    icono: "📥",
  },
  {
    valor: "en_diagnostico",
    etiqueta: "En diagnóstico",
    color: "bg-blue-100 text-blue-700",
    icono: "🔍",
  },
  {
    valor: "presupuesto_enviado",
    etiqueta: "Presupuesto enviado",
    color: "bg-yellow-100 text-yellow-700",
    icono: "💰",
  },
  {
    valor: "esperando_aprobacion",
    etiqueta: "Esperando aprobación",
    color: "bg-orange-100 text-orange-700",
    icono: "⏳",
  },
  {
    valor: "aprobado",
    etiqueta: "Aprobado",
    color: "bg-cyan-100 text-cyan-700",
    icono: "✅",
  },
  {
    valor: "en_reparacion",
    etiqueta: "En reparación",
    color: "bg-purple-100 text-purple-700",
    icono: "🔧",
  },
  {
    valor: "listo_para_retirar",
    etiqueta: "Listo para retirar",
    color: "bg-green-100 text-green-700",
    icono: "🎉",
  },
  {
    valor: "entregado",
    etiqueta: "Entregado",
    color: "bg-green-200 text-green-800",
    icono: "✔️",
  },
  {
    valor: "sin_reparacion",
    etiqueta: "Sin reparación",
    color: "bg-red-100 text-red-700",
    icono: "❌",
  },
];

export const TRANSICIONES: Record<EstadoReparacion, EstadoReparacion[]> = {
  recibido: ["en_diagnostico", "sin_reparacion"],
  en_diagnostico: ["presupuesto_enviado", "sin_reparacion"],
  presupuesto_enviado: ["esperando_aprobacion", "aprobado", "sin_reparacion"],
  esperando_aprobacion: ["aprobado", "en_reparacion", "sin_reparacion"],
  aprobado: ["en_reparacion", "sin_reparacion"],
  en_reparacion: ["listo_para_retirar", "sin_reparacion"],
  listo_para_retirar: ["entregado"],
  entregado: [], // terminal
  sin_reparacion: [], // terminal (D-05)
};

/** Flujo ideal de 8 pasos (sin sin_reparacion, que es un desvío terminal). */
export const ORDEN_FLUJO: EstadoReparacion[] = [
  "recibido",
  "en_diagnostico",
  "presupuesto_enviado",
  "esperando_aprobacion",
  "aprobado",
  "en_reparacion",
  "listo_para_retirar",
  "entregado",
];

/** Estados con contador visible en el listado de reparaciones. */
export const ESTADOS_CONTADORES: EstadoReparacion[] = [
  "recibido",
  "en_reparacion",
  "listo_para_retirar",
  "entregado",
];

/** Destinos permitidos desde `estado` ([] si es terminal o desconocido). */
export function siguientesEstados(
  estado: EstadoReparacion,
): EstadoReparacion[] {
  return TRANSICIONES[estado] ?? [];
}

/** True si la transición from → to está permitida por el mapa (spec R2). */
export function puedeTransicionar(
  from: EstadoReparacion,
  to: EstadoReparacion,
): boolean {
  return TRANSICIONES[from]?.includes(to) ?? false;
}
