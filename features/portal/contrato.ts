// features/portal/contrato.ts
//
// Contrato del portal público del alumno (R13–R15): tipos del jsonb que
// devuelve `obtener_portal_alumno` (allowlist exacta de la migración 0007) y
// validaciones puras de las Server Actions. Módulo sin imports de Next ni de
// Supabase para que sea testeable en vitest.

import { z } from "zod";

// --- Contrato de lectura (obtener_portal_alumno) ---------------------------

/** Actividad de una sesión (gym_rutina_ejercicios + gym_ejercicios). */
export interface PortalActividad {
  id: string;
  nombre: string;
  grupo_muscular: string | null;
  url_video: string | null;
  series: number | null;
  repeticiones: string | null;
  descanso_seg: number | null;
  notas: string | null;
  orden: number;
}

export interface PortalSesion {
  numero_sesion: number;
  actividades: PortalActividad[];
}

export interface PortalAsignacion {
  id: string;
  rutina: { id: string; nombre: string };
  sesiones_total: number;
  sesion_actual: number;
  fecha_inicio: string;
  sesiones: PortalSesion[];
}

export interface PortalCompletado {
  rutina_ejercicio_id: string;
  fecha: string;
}

export interface PortalProgreso {
  id: string;
  fecha: string;
  peso: number;
  cintura: number | null;
  cadera: number | null;
  porcentaje_grasa: number | null;
  pecho_cm: number | null;
  bicep_cm: number | null;
  metrica1_nombre: string | null;
  metrica1_valor: number | null;
  metrica2_nombre: string | null;
  metrica2_valor: number | null;
  notas: string | null;
}

export interface PortalPago {
  id: string;
  fecha: string;
  monto: number;
  concepto: string | null;
  medio_pago: string;
}

/** Payload del RPC de lectura; token desconocido → `null` (sin oráculo). */
export interface PortalAlumno {
  alumno: { nombre: string; objetivo: string | null; altura_cm: number | null };
  profe: { nombre: string };
  negocio: { nombre: string; rubro: string };
  asignacion: PortalAsignacion | null;
  completados: PortalCompletado[];
  progreso: PortalProgreso[];
  pagos: PortalPago[];
}

/** Retorno de los mutadores: `no_disponible` | `plan_completo` | ok. */
export interface PortalMutacion {
  ok: boolean;
  motivo?: "no_disponible" | "plan_completo";
  completado?: boolean;
  fecha?: string;
  sesion_actual?: number;
  sesiones_total?: number;
}

// --- Validaciones puras ----------------------------------------------------

/** Formato UUID canónico: el token es la capacidad del portal (AD-2). */
export const TOKEN_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** true solo para un UUID canónico (token del portal o id de actividad). */
export function esTokenUuid(valor: string): boolean {
  return TOKEN_UUID_REGEX.test(valor);
}

const uuid = z.string().regex(TOKEN_UUID_REGEX, "Token inválido.");
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.");

/**
 * Formulario de marcar/desmarcar. La fecha la aporta el navegador del alumno
 * (día local de entrenamiento, no el UTC del server) y el RPC la persiste.
 */
export const completadoPortalSchema = z.object({
  slug: z.string().min(1),
  token: uuid,
  rutina_ejercicio_id: uuid,
  fecha,
});

/** Formulario de avance de sesión: solo slug + token. */
export const tokenPortalSchema = z.object({
  slug: z.string().min(1),
  token: uuid,
});
