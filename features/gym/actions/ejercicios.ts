// features/gym/actions/ejercicios.ts
//
// Server Actions del catálogo de ejercicios (R4, AD-3). El catálogo global
// (`negocio_id` null) es de solo lectura para todos: las escrituras van
// scopeadas al negocio y las policies de 0006 exigen negocio_id is not null,
// así que el global es inmodificable por construcción (D3/AD-3).

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";

export type GymActionResult = { ok: boolean; error?: string };

const crearEjercicioSchema = z.object({
  slug: z.string().min(1),
  nombre: z.string().trim().min(1, "Completá todos los campos"),
  grupo_muscular: z.string().trim().optional(),
  descripcion: z.string().trim().optional(),
  url_video: z.string().trim().optional(),
});

const actualizarEjercicioSchema = crearEjercicioSchema.extend({
  ejercicio_id: z.string().min(1),
});

const eliminarEjercicioSchema = z.object({
  slug: z.string().min(1),
  ejercicio_id: z.string().min(1),
});

/** Alta de un ejercicio propio del negocio (R4). */
export async function crearEjercicio(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = crearEjercicioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { error } = await supabase.from("gym_ejercicios").insert({
    negocio_id: negocio.id,
    nombre: input.nombre,
    grupo_muscular: input.grupo_muscular || null,
    descripcion: input.descripcion || null,
    url_video: input.url_video || null,
  });
  if (error) {
    console.error("[crearEjercicio] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el ejercicio." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Edición de un ejercicio propio (R4). Scopeado por id + negocio_id: el
 * catálogo global (`negocio_id` null) queda fuera del update (D3/AD-3).
 */
export async function actualizarEjercicio(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = actualizarEjercicioSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gym_ejercicios")
    .update({
      nombre: input.nombre,
      grupo_muscular: input.grupo_muscular || null,
      descripcion: input.descripcion || null,
      url_video: input.url_video || null,
    })
    .eq("id", input.ejercicio_id)
    .eq("negocio_id", negocio.id)
    .select("id");
  if (error) {
    console.error("[actualizarEjercicio] update:", error.message);
    return { ok: false, error: "No se pudo guardar el ejercicio." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el ejercicio." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Baja de un ejercicio propio (R4). Si está usado en una rutina, la FK
 * `gym_rutina_ejercicios.ejercicio_id` es restrict (0006): Postgres responde
 * 23503 y se traduce a un mensaje accionable.
 */
export async function eliminarEjercicio(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = eliminarEjercicioSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, ejercicio_id: ejercicioId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gym_ejercicios")
    .delete()
    .eq("id", ejercicioId)
    .eq("negocio_id", negocio.id)
    .select("id");
  if (error) {
    console.error("[eliminarEjercicio] delete:", error.message);
    if (error.code === "23503") {
      return {
        ok: false,
        error: "No se puede eliminar: el ejercicio está usado en una rutina.",
      };
    }
    return { ok: false, error: "No se pudo eliminar el ejercicio." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el ejercicio." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
