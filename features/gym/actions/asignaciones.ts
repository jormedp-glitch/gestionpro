// features/gym/actions/asignaciones.ts
//
// Server Actions de asignaciones, progreso y completados (R6, R8, AD-4,
// AD-5). Asignar una rutina desactiva la anterior (AD-4: una sola activa por
// alumno) y el avance de sesión topea en `sesiones_total` (R6). Los completados
// son idempotentes por (cliente, ejercicio, fecha): el doble click del portal
// no duplica (AD-5). Toda escritura pasa por zod v4 → requireNegocio →
// supabase server → revalidatePath.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";

export type GymActionResult = { ok: boolean; error?: string };

/** Numérico opcional de un <form>: "" (input vacío) y ausente → undefined. */
const numeroOpcional = z.preprocess(
  (valor) => (valor === "" ? undefined : valor),
  z.coerce.number().positive("Completá todos los campos").optional(),
);

const asignarRutinaSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
  rutina_id: z.string().min(1),
});

const desasignarRutinaSchema = z.object({
  slug: z.string().min(1),
  asignacion_id: z.string().min(1),
});

const avanzarSesionSchema = z.object({
  slug: z.string().min(1),
  asignacion_id: z.string().min(1),
});

const registrarProgresoSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
  fecha: z.string().trim().optional(),
  peso: z.coerce.number().positive("Completá todos los campos"),
  cintura: numeroOpcional,
  cadera: numeroOpcional,
  porcentaje_grasa: numeroOpcional,
  pecho_cm: numeroOpcional,
  bicep_cm: numeroOpcional,
  metrica1_nombre: z.string().trim().optional(),
  metrica1_valor: numeroOpcional,
  metrica2_nombre: z.string().trim().optional(),
  metrica2_valor: numeroOpcional,
  notas: z.string().trim().optional(),
});

const completadoSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
  rutina_ejercicio_id: z.string().min(1),
  fecha: z.string().trim().optional(),
});

/**
 * Asigna una rutina al alumno (R6). AD-4: se desactiva la asignación vigente
 * antes de insertar la nueva — el índice parcial de 0006 no admite dos activas
 * por cliente. Cliente y rutina se validan scopeados al negocio.
 */
export async function asignarRutina(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = asignarRutinaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, cliente_id: clienteId, rutina_id: rutinaId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ id: string }>();
  if (errorCliente || !cliente) {
    console.error(
      "[asignarRutina] cliente:",
      errorCliente?.message ?? "cliente no encontrado",
    );
    return { ok: false, error: "Alumno no encontrado." };
  }

  const { data: rutina, error: errorRutina } = await supabase
    .from("gym_rutinas")
    .select("id")
    .eq("id", rutinaId)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ id: string }>();
  if (errorRutina || !rutina) {
    console.error(
      "[asignarRutina] rutina:",
      errorRutina?.message ?? "rutina no encontrada",
    );
    return { ok: false, error: "Rutina no encontrada." };
  }

  // AD-4: una sola activa por alumno — primero se desactiva la vigente y se
  // recuerda su id para poder compensar si el insert falla.
  const { data: previas, error: errorDesactivar } = await supabase
    .from("gym_asignaciones")
    .update({ activa: false })
    .eq("cliente_id", clienteId)
    .eq("negocio_id", negocio.id)
    .eq("activa", true)
    .select("id");
  if (errorDesactivar) {
    console.error("[asignarRutina] desactivar:", errorDesactivar.message);
    return { ok: false, error: "No se pudo asignar la rutina." };
  }

  const hoy = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("gym_asignaciones").insert({
    negocio_id: negocio.id,
    cliente_id: clienteId,
    rutina_id: rutinaId,
    sesion_actual: 1,
    fecha_inicio: hoy,
    activa: true,
  });
  if (error) {
    console.error("[asignarRutina] insert:", error.message);
    // Compensación: si falla el insert, se reactiva la asignación anterior.
    const previaId = ((previas ?? []) as Array<{ id: string }>)[0]?.id;
    if (previaId) {
      const { error: errorCompensacion } = await supabase
        .from("gym_asignaciones")
        .update({ activa: true })
        .eq("id", previaId)
        .eq("negocio_id", negocio.id);
      if (errorCompensacion) {
        console.error(
          "[asignarRutina] compensación:",
          errorCompensacion.message,
        );
        return {
          ok: false,
          error:
            "No se pudo asignar la rutina y tampoco restaurar la asignación anterior. Revisá las asignaciones del alumno.",
        };
      }
    }
    return { ok: false, error: "No se pudo asignar la rutina." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Desactiva la asignación vigente del alumno (R6). La fila no se borra: queda
 * el historial y `activa = false` libera el índice parcial de AD-4.
 */
export async function desasignarRutina(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = desasignarRutinaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, asignacion_id: asignacionId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gym_asignaciones")
    .update({ activa: false })
    .eq("id", asignacionId)
    .eq("negocio_id", negocio.id)
    .select("id");
  if (error) {
    console.error("[desasignarRutina] update:", error.message);
    return { ok: false, error: "No se pudo desasignar la rutina." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró la asignación." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Avanza la sesión actual de la asignación activa (R6). Topa en
 * `sesiones_total`: completada la última, el portal no avanza más.
 */
export async function avanzarSesion(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = avanzarSesionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, asignacion_id: asignacionId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data: asignacion, error: errorAsignacion } = await supabase
    .from("gym_asignaciones")
    .select("id, sesion_actual, rutina:gym_rutinas(sesiones_total)")
    .eq("id", asignacionId)
    .eq("negocio_id", negocio.id)
    .eq("activa", true)
    .maybeSingle<{
      id: string;
      sesion_actual: number;
      rutina: { sesiones_total: number } | null;
    }>();
  if (errorAsignacion || !asignacion || !asignacion.rutina) {
    console.error(
      "[avanzarSesion] select:",
      errorAsignacion?.message ?? "asignación no encontrada",
    );
    return { ok: false, error: "Asignación no encontrada." };
  }
  if (asignacion.sesion_actual >= asignacion.rutina.sesiones_total) {
    return { ok: false, error: "El alumno ya completó todas las sesiones." };
  }

  const { error } = await supabase
    .from("gym_asignaciones")
    .update({ sesion_actual: asignacion.sesion_actual + 1 })
    .eq("id", asignacionId)
    .eq("negocio_id", negocio.id)
    .eq("activa", true);
  if (error) {
    console.error("[avanzarSesion] update:", error.message);
    return { ok: false, error: "No se pudo avanzar la sesión." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Registra una medición de progreso (R8). El cliente se valida scopeado al
 * negocio (defensa en profundidad sobre RLS); sin fecha, se usa hoy.
 */
export async function registrarProgreso(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = registrarProgresoSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", input.cliente_id)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ id: string }>();
  if (errorCliente || !cliente) {
    console.error(
      "[registrarProgreso] cliente:",
      errorCliente?.message ?? "cliente no encontrado",
    );
    return { ok: false, error: "Alumno no encontrado." };
  }

  const hoy = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("gym_progreso").insert({
    negocio_id: negocio.id,
    cliente_id: input.cliente_id,
    fecha: input.fecha || hoy,
    peso: input.peso,
    cintura: input.cintura ?? null,
    cadera: input.cadera ?? null,
    porcentaje_grasa: input.porcentaje_grasa ?? null,
    pecho_cm: input.pecho_cm ?? null,
    bicep_cm: input.bicep_cm ?? null,
    metrica1_nombre: input.metrica1_nombre || null,
    metrica1_valor: input.metrica1_valor ?? null,
    metrica2_nombre: input.metrica2_nombre || null,
    metrica2_valor: input.metrica2_valor ?? null,
    notas: input.notas || null,
  });
  if (error) {
    console.error("[registrarProgreso] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el progreso." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Marca un ejercicio de la rutina como completado (AD-5). Idempotente: el
 * upsert con `ignoreDuplicates` sobre la unique (cliente, ejercicio, fecha)
 * hace que el doble click no duplique.
 */
export async function marcarCompletado(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = completadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const {
    slug,
    cliente_id: clienteId,
    rutina_ejercicio_id: actividadId,
  } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ id: string }>();
  if (errorCliente || !cliente) {
    console.error(
      "[marcarCompletado] cliente:",
      errorCliente?.message ?? "cliente no encontrado",
    );
    return { ok: false, error: "Alumno no encontrado." };
  }

  const hoy = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("gym_completados").upsert(
    {
      negocio_id: negocio.id,
      cliente_id: clienteId,
      rutina_ejercicio_id: actividadId,
      fecha: parsed.data.fecha || hoy,
    },
    {
      onConflict: "cliente_id,rutina_ejercicio_id,fecha",
      ignoreDuplicates: true,
    },
  );
  if (error) {
    console.error("[marcarCompletado] upsert:", error.message);
    return { ok: false, error: "No se pudo marcar el ejercicio." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Deshace el completado de un ejercicio (AD-5): borra la fila del día para
 * que el toggle del portal pueda corregir un toque equivocado.
 */
export async function desmarcarCompletado(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = completadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const {
    slug,
    cliente_id: clienteId,
    rutina_ejercicio_id: actividadId,
  } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const hoy = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("gym_completados")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("rutina_ejercicio_id", actividadId)
    .eq("fecha", parsed.data.fecha || hoy)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[desmarcarCompletado] delete:", error.message);
    return { ok: false, error: "No se pudo desmarcar el ejercicio." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
