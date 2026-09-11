// features/turnos/actions/turnos.ts
//
// Server Actions del feature turnos (spec R9). Toda escritura privada pasa
// por acá: zod v4 → requireNegocio → supabase server → revalidatePath.
// El WhatsApp de confirmación se arma con lib/domain/mensajes + wa.ts
// (R3/R4) y el cliente solo abre la URL devuelta.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";
import { mensajeTurnoConfirmado } from "@/lib/domain/mensajes";
import { formatFecha } from "@/lib/domain/formato";
import { buildWhatsAppLink } from "@/lib/domain/wa";

export type TurnoActionResult = { ok: boolean; error?: string; waUrl?: string };

const crearTurnoSchema = z.object({
  slug: z.string().min(1),
  cliente_nombre: z.string().trim().min(1, "Completá el nombre"),
  telefono: z.string().trim().optional(),
  servicio: z.string().trim().min(1, "Completá el servicio"),
  fecha: z.string().trim().min(1, "Completá la fecha"),
  hora: z.string().trim().min(1, "Completá la hora"),
  duracion: z.coerce.number().int().positive().optional(),
  notas: z.string().trim().optional(),
});

const completarTurnoSchema = z.object({
  slug: z.string().min(1),
  turno_id: z.string().min(1),
});

/**
 * Alta de turno (R9): valida con zod, inserta con estado "confirmado" y
 * revalida la ruta del shell. Si hay teléfono, devuelve el waUrl del mensaje
 * de confirmación (R3/R4) para que el cliente lo abra.
 */
export async function crearTurno(
  _prev: TurnoActionResult,
  formData: FormData,
): Promise<TurnoActionResult> {
  const parsed = crearTurnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Completá todos los campos" };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { error } = await supabase.from("turnos").insert({
    negocio_id: negocio.id,
    cliente_nombre: input.cliente_nombre,
    telefono: input.telefono || "",
    servicio: input.servicio,
    fecha: input.fecha,
    hora: input.hora,
    duracion: input.duracion ?? 60,
    estado: "confirmado",
    notas: input.notas || "",
  });
  if (error) {
    console.error("[crearTurno] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el turno." };
  }

  revalidatePath(`/${input.slug}`);

  let waUrl: string | undefined;
  if (input.telefono) {
    waUrl = buildWhatsAppLink(
      input.telefono,
      mensajeTurnoConfirmado(
        negocio.nombre,
        input.cliente_nombre,
        formatFecha(input.fecha),
        input.hora,
      ),
    );
  }

  return { ok: true, waUrl };
}

/** Marca el turno como completado (R9) y revalida la ruta del shell. */
export async function completarTurno(
  _prev: TurnoActionResult,
  formData: FormData,
): Promise<TurnoActionResult> {
  const parsed = completarTurnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, turno_id: turnoId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("turnos")
    .update({ estado: "completado" })
    .eq("id", turnoId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[completarTurno] update:", error.message);
    return { ok: false, error: "No se pudo completar el turno." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
