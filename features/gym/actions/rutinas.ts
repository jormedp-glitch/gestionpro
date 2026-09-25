// features/gym/actions/rutinas.ts
//
// Server Actions de rutinas (R5). Una rutina nace con sus N sesiones
// (1..sesiones_total) creadas en el mismo alta; si el insert de sesiones falla
// se borra la rutina recién creada (compensación): una rutina sin sesiones es
// inusable. Las actividades se agregan a una sesión con `orden` incremental
// (0,1,2…) y se renumeran al quitar una, para que el orden quede sin huecos.
// Toda escritura pasa por zod v4 → requireNegocio → supabase server →
// revalidatePath.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";

export type GymActionResult = { ok: boolean; error?: string };

/** Entero opcional de un <form>: "" (input vacío) y ausente → undefined. */
const enteroOpcional = z.preprocess(
  (valor) => (valor === "" ? undefined : valor),
  z.coerce.number().int().positive("Completá todos los campos").optional(),
);

const crearRutinaSchema = z.object({
  slug: z.string().min(1),
  nombre: z.string().trim().min(1, "Completá todos los campos"),
  descripcion: z.string().trim().optional(),
  sesiones_total: z.coerce.number().int().min(1).max(52),
});

const actualizarRutinaSchema = z.object({
  slug: z.string().min(1),
  rutina_id: z.string().min(1),
  nombre: z.string().trim().min(1, "Completá todos los campos"),
  descripcion: z.string().trim().optional(),
});

const eliminarRutinaSchema = z.object({
  slug: z.string().min(1),
  rutina_id: z.string().min(1),
});

const agregarActividadSchema = z.object({
  slug: z.string().min(1),
  sesion_id: z.string().min(1),
  ejercicio_id: z.string().min(1),
  series: enteroOpcional,
  repeticiones: z.string().trim().optional(),
  descanso_seg: enteroOpcional,
  notas: z.string().trim().optional(),
});

const quitarActividadSchema = z.object({
  slug: z.string().min(1),
  actividad_id: z.string().min(1),
});

/**
 * Alta de rutina con sus sesiones (R5): inserta la rutina y después las
 * sesiones 1..sesiones_total. Si el insert de sesiones falla se compensa
 * borrando la rutina recién creada.
 */
export async function crearRutina(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = crearRutinaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { data: rutina, error: errorRutina } = await supabase
    .from("gym_rutinas")
    .insert({
      negocio_id: negocio.id,
      nombre: input.nombre,
      descripcion: input.descripcion || null,
      sesiones_total: input.sesiones_total,
    })
    .select("id")
    .single();
  if (errorRutina) {
    console.error("[crearRutina] insert:", errorRutina.message);
    return { ok: false, error: "No se pudo guardar la rutina." };
  }

  const sesiones = Array.from({ length: input.sesiones_total }, (_, i) => ({
    negocio_id: negocio.id,
    rutina_id: rutina.id,
    numero_sesion: i + 1,
  }));
  const { error: errorSesiones } = await supabase
    .from("gym_rutina_sesiones")
    .insert(sesiones);
  if (errorSesiones) {
    console.error("[crearRutina] sesiones:", errorSesiones.message);
    // Compensación (R5): sin sesiones la rutina no sirve.
    const { error: errorCompensacion } = await supabase
      .from("gym_rutinas")
      .delete()
      .eq("id", rutina.id)
      .eq("negocio_id", negocio.id);
    if (errorCompensacion) {
      console.error("[crearRutina] compensación:", errorCompensacion.message);
    }
    return { ok: false, error: "No se pudo guardar la rutina." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/** Edición de nombre/descripción de una rutina del negocio (R5). */
export async function actualizarRutina(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = actualizarRutinaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gym_rutinas")
    .update({
      nombre: input.nombre,
      descripcion: input.descripcion || null,
    })
    .eq("id", input.rutina_id)
    .eq("negocio_id", negocio.id)
    .select("id");
  if (error) {
    console.error("[actualizarRutina] update:", error.message);
    return { ok: false, error: "No se pudo guardar la rutina." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró la rutina." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Baja de una rutina (R5). Si está asignada a un alumno, la FK
 * `gym_asignaciones.rutina_id` es restrict (0006): Postgres responde 23503 y
 * se traduce a un mensaje accionable.
 */
export async function eliminarRutina(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = eliminarRutinaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, rutina_id: rutinaId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gym_rutinas")
    .delete()
    .eq("id", rutinaId)
    .eq("negocio_id", negocio.id)
    .select("id");
  if (error) {
    console.error("[eliminarRutina] delete:", error.message);
    if (error.code === "23503") {
      return {
        ok: false,
        error: "No se puede eliminar: la rutina está asignada a un alumno.",
      };
    }
    return { ok: false, error: "No se pudo eliminar la rutina." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró la rutina." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Agrega un ejercicio a una sesión (R5) con `orden` incremental. La sesión se
 * valida scopeada al negocio y el ejercicio debe ser propio o del catálogo
 * global (AD-3): el id solo no alcanza como autorización.
 */
export async function agregarActividad(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = agregarActividadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { data: sesion, error: errorSesion } = await supabase
    .from("gym_rutina_sesiones")
    .select("id")
    .eq("id", input.sesion_id)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ id: string }>();
  if (errorSesion || !sesion) {
    console.error(
      "[agregarActividad] sesión:",
      errorSesion?.message ?? "sesión no encontrada",
    );
    return { ok: false, error: "Sesión no encontrada." };
  }

  const { data: ejercicio, error: errorEjercicio } = await supabase
    .from("gym_ejercicios")
    .select("id")
    .eq("id", input.ejercicio_id)
    .or(`negocio_id.is.null,negocio_id.eq.${negocio.id}`)
    .maybeSingle<{ id: string }>();
  if (errorEjercicio || !ejercicio) {
    console.error(
      "[agregarActividad] ejercicio:",
      errorEjercicio?.message ?? "ejercicio no encontrado",
    );
    return { ok: false, error: "No se encontró el ejercicio." };
  }

  const { data: ultima, error: errorUltima } = await supabase
    .from("gym_rutina_ejercicios")
    .select("orden")
    .eq("sesion_id", input.sesion_id)
    .eq("negocio_id", negocio.id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();
  if (errorUltima) {
    console.error("[agregarActividad] orden:", errorUltima.message);
    return {
      ok: false,
      error: "No se pudo calcular el orden de la actividad.",
    };
  }

  const { error } = await supabase.from("gym_rutina_ejercicios").insert({
    negocio_id: negocio.id,
    sesion_id: input.sesion_id,
    ejercicio_id: input.ejercicio_id,
    series: input.series ?? null,
    repeticiones: input.repeticiones || null,
    descanso_seg: input.descanso_seg ?? null,
    notas: input.notas || null,
    // El orden arranca en 0 (default de la columna) y sigue al máximo actual.
    orden: (ultima?.orden ?? -1) + 1,
  });
  if (error) {
    console.error("[agregarActividad] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el ejercicio." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Quita una actividad de la sesión (R5) y renumera las restantes (0,1,2…)
 * para que el orden quede consistente, sin huecos.
 */
export async function quitarActividad(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = quitarActividadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, actividad_id: actividadId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  // Se lee la actividad para conocer su sesión antes de borrarla.
  const { data: actividad, error: errorActividad } = await supabase
    .from("gym_rutina_ejercicios")
    .select("sesion_id")
    .eq("id", actividadId)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ sesion_id: string }>();
  if (errorActividad || !actividad) {
    console.error(
      "[quitarActividad] select:",
      errorActividad?.message ?? "actividad no encontrada",
    );
    return { ok: false, error: "No se pudo quitar el ejercicio." };
  }

  const { error } = await supabase
    .from("gym_rutina_ejercicios")
    .delete()
    .eq("id", actividadId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[quitarActividad] delete:", error.message);
    return { ok: false, error: "No se pudo quitar el ejercicio." };
  }

  // Renumeración: las restantes vuelven a 0,1,2… (solo las que cambiaron).
  const { data: restantes, error: errorRestantes } = await supabase
    .from("gym_rutina_ejercicios")
    .select("id, orden")
    .eq("sesion_id", actividad.sesion_id)
    .eq("negocio_id", negocio.id)
    .order("orden");
  if (errorRestantes) {
    console.error("[quitarActividad] reorden:", errorRestantes.message);
    // El delete ya se commiteó: la ruta se revalida aunque el reorden falle.
    revalidatePath(`/${slug}`);
    return {
      ok: false,
      error:
        "La actividad se quitó, pero no se pudo reordenar la sesión. Revisá el orden.",
    };
  }
  const filas = (restantes ?? []) as Array<{ id: string; orden: number }>;
  for (const [indice, fila] of filas.entries()) {
    if (fila.orden === indice) continue;
    const { error: errorOrden } = await supabase
      .from("gym_rutina_ejercicios")
      .update({ orden: indice })
      .eq("id", fila.id)
      .eq("negocio_id", negocio.id);
    if (errorOrden) {
      console.error("[quitarActividad] orden:", errorOrden.message);
      // El delete ya se commiteó: la ruta se revalida aunque el reorden falle.
      revalidatePath(`/${slug}`);
      return {
        ok: false,
        error:
          "La actividad se quitó, pero no se pudo reordenar la sesión. Revisá el orden.",
      };
    }
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
