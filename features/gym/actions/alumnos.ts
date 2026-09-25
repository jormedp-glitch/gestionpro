// features/gym/actions/alumnos.ts
//
// Server Actions de la ficha del alumno (R2, R3). El alta escribe en dos tablas:
// el cliente (núcleo) y la ficha gym_alumnos, con compensación si la ficha falla.
// Toda escritura: zod → requireNegocio → supabase server → revalidatePath.

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

const agregarAlumnoSchema = z.object({
  slug: z.string().min(1),
  nombre: z.string().trim().min(1, "Completá todos los campos"),
  telefono: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .pipe(z.literal("").or(z.email("Ingresá un email válido")))
    .optional(),
  objetivo: z.string().trim().optional(),
  notas: z.string().trim().optional(),
  altura_cm: numeroOpcional,
  fecha_nac: z.string().trim().optional(),
});

const actualizarAlumnoSchema = agregarAlumnoSchema.extend({
  cliente_id: z.string().min(1),
});

const eliminarAlumnoSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
});

const regenerarCodigoAccesoSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
});

/**
 * Alta de alumno (R2): cliente (núcleo) + ficha gym_alumnos en dos pasos. El
 * `portal_token` lo genera la DB. Si la ficha falla se borra el cliente
 * recién creado: sin gym_alumnos el cliente no es un alumno.
 */
export async function agregarAlumno(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = agregarAlumnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .insert({
      negocio_id: negocio.id,
      nombre: input.nombre,
      telefono: input.telefono || null,
      email: input.email || null,
      plan: null,
      cuota: null,
      vence: null,
      estado: "activo",
    })
    .select("id")
    .single();
  if (errorCliente) {
    console.error("[agregarAlumno] cliente:", errorCliente.message);
    return { ok: false, error: "No se pudo guardar el alumno." };
  }

  const { error: errorAlumno } = await supabase.from("gym_alumnos").insert({
    cliente_id: cliente.id,
    negocio_id: negocio.id,
    objetivo: input.objetivo || null,
    notas: input.notas || null,
    altura_cm: input.altura_cm ?? null,
    fecha_nac: input.fecha_nac || null,
  });
  if (errorAlumno) {
    console.error("[agregarAlumno] gym_alumnos:", errorAlumno.message);
    // Compensación (R2): sin ficha, el cliente no debe quedar creado.
    const { error: errorCompensacion } = await supabase
      .from("clientes")
      .delete()
      .eq("id", cliente.id)
      .eq("negocio_id", negocio.id);
    if (errorCompensacion) {
      console.error("[agregarAlumno] compensación:", errorCompensacion.message);
    }
    return { ok: false, error: "No se pudo guardar el alumno." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Edición de la ficha del alumno (R2): cliente (nombre/contacto) + ficha
 * gym_alumnos (objetivo/notas/altura/nacimiento), ambos scopeados al negocio.
 */
export async function actualizarAlumno(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = actualizarAlumnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  // Pre-chequeo (R2): sin ficha no se toca el cliente — evita una escritura
  // parcial que después no se puede deshacer.
  const { data: ficha, error: errorFicha } = await supabase
    .from("gym_alumnos")
    .select("cliente_id")
    .eq("cliente_id", input.cliente_id)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ cliente_id: string }>();
  if (errorFicha || !ficha) {
    console.error(
      "[actualizarAlumno] ficha:",
      errorFicha?.message ?? "ficha no encontrada",
    );
    return { ok: false, error: "No se encontró el alumno." };
  }

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .update({
      nombre: input.nombre,
      telefono: input.telefono || null,
      email: input.email || null,
    })
    .eq("id", input.cliente_id)
    .eq("negocio_id", negocio.id)
    .select("id");
  if (errorCliente) {
    console.error("[actualizarAlumno] cliente:", errorCliente.message);
    return { ok: false, error: "No se pudo guardar el alumno." };
  }
  if (!cliente || cliente.length === 0) {
    return { ok: false, error: "No se encontró el alumno." };
  }

  const { data: alumno, error: errorAlumno } = await supabase
    .from("gym_alumnos")
    .update({
      objetivo: input.objetivo || null,
      notas: input.notas || null,
      altura_cm: input.altura_cm ?? null,
      fecha_nac: input.fecha_nac || null,
    })
    .eq("cliente_id", input.cliente_id)
    .eq("negocio_id", negocio.id)
    .select("cliente_id");
  if (errorAlumno) {
    console.error("[actualizarAlumno] gym_alumnos:", errorAlumno.message);
    return { ok: false, error: "No se pudo guardar el alumno." };
  }
  if (!alumno || alumno.length === 0) {
    return { ok: false, error: "No se encontró el alumno." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Baja del alumno (R2): se borra el cliente y con él caen las tablas gym_* y
 * cobros (cascade); `turnos.cliente_id` queda en null. Scopeado al negocio.
 */
export async function eliminarAlumno(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = eliminarAlumnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, cliente_id: clienteId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", clienteId)
    .eq("negocio_id", negocio.id)
    .select("id");
  if (error) {
    console.error("[eliminarAlumno] delete:", error.message);
    return { ok: false, error: "No se pudo eliminar el alumno." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el alumno." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Regenera el `portal_token` del alumno (R3): el link viejo del portal deja
 * de servir. El token es la capacidad de acceso (AD-2), no el codigo_acceso.
 */
export async function regenerarCodigoAcceso(
  _prev: GymActionResult,
  formData: FormData,
): Promise<GymActionResult> {
  const parsed = regenerarCodigoAccesoSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, cliente_id: clienteId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gym_alumnos")
    .update({ portal_token: crypto.randomUUID() })
    .eq("cliente_id", clienteId)
    .eq("negocio_id", negocio.id)
    .select("cliente_id");
  if (error) {
    console.error("[regenerarCodigoAcceso] update:", error.message);
    return { ok: false, error: "No se pudo regenerar el acceso." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el alumno." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
