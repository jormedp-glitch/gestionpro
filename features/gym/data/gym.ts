// features/gym/data/gym.ts
//
// Capa de datos del rubro gimnasio (R2, R5, R8, AD-3). Lectura server-side de
// alumnos, catálogo de ejercicios, rutinas, asignaciones, progreso y
// completados. El shell y las Server Actions resuelven negocio + membresía y
// llaman a estas funciones con el `negocioId` ya validado; acá solo se lee con
// el cliente server.
//
// Tipos manuales: types/database.types.ts es un snapshot PRE-rollout y no
// incluye las tablas gym_* (regenerarlo es tarea posterior). Mismo criterio
// que features/clientes/data/clientes.ts con `Cliente`.
//
// Este módulo es server-only: los client components reciben los datos como
// props y los tipos via `import type` (se borra en compilación).

import { createClient } from "@/lib/supabase/server";

/** Alumno con su ficha gym + los datos de la fila de `clientes` (R2). */
export interface GymAlumno {
  cliente_id: string;
  negocio_id: string;
  objetivo: string | null;
  notas: string | null;
  altura_cm: number | null;
  fecha_nac: string | null;
  portal_token: string;
  codigo_acceso: string | null;
  created_at: string;
  cliente: {
    nombre: string;
    telefono: string | null;
    email: string | null;
    plan: string | null;
    cuota: number | null;
    vence: string | null;
    estado: string | null;
  } | null;
}

/** Ejercicio del catálogo: `negocio_id` null = global compartido (AD-3). */
export interface GymEjercicio {
  id: string;
  negocio_id: string | null;
  nombre: string;
  grupo_muscular: string | null;
  descripcion: string | null;
  url_video: string | null;
  activo: boolean;
  created_at: string;
}

/** Rutina del negocio con su cantidad de sesiones (R5). */
export interface GymRutina {
  id: string;
  negocio_id: string;
  nombre: string;
  descripcion: string | null;
  sesiones_total: number;
  activo: boolean;
  created_at: string;
}

/** Ejercicio dentro de una sesión, con su ejercicio embebido (R5). */
export interface GymActividad {
  id: string;
  negocio_id: string;
  sesion_id: string;
  ejercicio_id: string;
  series: number | null;
  repeticiones: string | null;
  descanso_seg: number | null;
  notas: string | null;
  orden: number;
  ejercicio: GymEjercicio | null;
}

/** Sesión de una rutina con sus actividades (R5). */
export interface GymRutinaSesion {
  id: string;
  negocio_id: string;
  rutina_id: string;
  numero_sesion: number;
  actividades: GymActividad[];
}

/** Asignación de rutina a un alumno; `activa` única por cliente (AD-4). */
export interface GymAsignacion {
  id: string;
  negocio_id: string;
  cliente_id: string;
  rutina_id: string;
  sesion_actual: number;
  fecha_inicio: string;
  activa: boolean;
  rutina: GymRutina | null;
}

/** Medición de progreso del alumno (R8). */
export interface GymProgreso {
  id: string;
  negocio_id: string;
  cliente_id: string;
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
  created_at: string;
}

/** Medición de progreso reducida a lo que consume la lista de alumnos (IMC). */
export type GymProgresoResumen = Pick<
  GymProgreso,
  "cliente_id" | "fecha" | "peso"
>;

/** Ejercicio completado por el alumno; idempotente por día (AD-5). */
export interface GymCompletado {
  id: string;
  negocio_id: string;
  cliente_id: string;
  rutina_ejercicio_id: string;
  fecha: string;
  created_at: string;
}

/**
 * Alumnos del negocio con su cliente embebido (R2), más nuevos primero. El
 * `estado` de la cuota se deriva del `vence` en la vista (lib/domain/cuotas).
 */
export async function getAlumnosDeNegocio(
  negocioId: string,
): Promise<GymAlumno[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_alumnos")
    .select(
      "*, cliente:clientes(nombre, telefono, email, plan, cuota, vence, estado)",
    )
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false });
  return (data ?? []) as GymAlumno[];
}

/**
 * Ejercicios del negocio + catálogo global compartido (AD-3: `negocio_id`
 * null = solo lectura para todos). Orden alfabético por nombre.
 */
export async function getEjerciciosDeNegocio(
  negocioId: string,
): Promise<GymEjercicio[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_ejercicios")
    .select("*")
    .or(`negocio_id.is.null,negocio_id.eq.${negocioId}`)
    .order("nombre");
  return (data ?? []) as GymEjercicio[];
}

/** Rutinas del negocio (R5), más nuevas primero. */
export async function getRutinasDeNegocio(
  negocioId: string,
): Promise<GymRutina[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_rutinas")
    .select("*")
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false });
  return (data ?? []) as GymRutina[];
}

/**
 * Sesiones de una rutina con sus actividades y el ejercicio embebido (R5).
 * Las actividades se ordenan por `orden` en memoria: el orden anidado de
 * PostgREST no está garantizado.
 */
export async function getRutinaConSesiones(
  rutinaId: string,
  negocioId: string,
): Promise<GymRutinaSesion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_rutina_sesiones")
    .select(
      "*, actividades:gym_rutina_ejercicios(*, ejercicio:gym_ejercicios(*))",
    )
    .eq("rutina_id", rutinaId)
    .eq("negocio_id", negocioId)
    .order("numero_sesion");
  return ((data ?? []) as GymRutinaSesion[]).map((sesion) => ({
    ...sesion,
    actividades: [...sesion.actividades].sort((a, b) => a.orden - b.orden),
  }));
}

/**
 * Asignación activa del alumno (AD-4: a lo sumo una por cliente), con su
 * rutina embebida. `null` si no tiene rutina asignada.
 */
export async function getAsignacionActiva(
  clienteId: string,
  negocioId: string,
): Promise<GymAsignacion | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_asignaciones")
    .select("*, rutina:gym_rutinas(*)")
    .eq("cliente_id", clienteId)
    .eq("negocio_id", negocioId)
    .eq("activa", true)
    .maybeSingle();
  return (data as GymAsignacion | null) ?? null;
}

/** Progreso del alumno (R8), más reciente primero (desempate por carga). */
export async function getProgresoDeCliente(
  clienteId: string,
  negocioId: string,
): Promise<GymProgreso[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_progreso")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("negocio_id", negocioId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as GymProgreso[];
}

/**
 * Progreso de todo el negocio reducido a `cliente_id`/`fecha`/`peso` (para el
 * IMC de la lista, R7). Orden determinista: fecha desc y, a igual fecha,
 * `created_at` desc, así la primera medición de cada alumno es la más reciente.
 */
export async function getProgresoDeNegocio(
  negocioId: string,
): Promise<GymProgresoResumen[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_progreso")
    .select("cliente_id, fecha, peso")
    .eq("negocio_id", negocioId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as GymProgresoResumen[];
}

/** Completados del alumno (AD-5), más reciente primero. */
export async function getCompletadosDeCliente(
  clienteId: string,
  negocioId: string,
): Promise<GymCompletado[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gym_completados")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("negocio_id", negocioId)
    .order("fecha", { ascending: false });
  return (data ?? []) as GymCompletado[];
}
