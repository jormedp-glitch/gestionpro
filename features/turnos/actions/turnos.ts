// features/turnos/actions/turnos.ts
//
// Server Actions del feature turnos (spec R9). Toda escritura privada pasa
// por acá: zod v4 → requireNegocio → supabase server → revalidatePath.
// El WhatsApp de confirmación se arma con lib/domain/mensajes + wa.ts
// (R3/R4) y el cliente solo abre la URL devuelta.
//
// #190: la agenda se gestiona (ABM). Además del alta y completar, acá viven
// editar, cancelar, marcar "no vino" y eliminar. Toda escritura va scopeada
// al negocio (id + negocio_id): un turno ajeno nunca es alcanzable.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";
import { mensajeTurnoConfirmado } from "@/lib/domain/mensajes";
import { formatFecha } from "@/lib/domain/formato";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { fechasRecurrentes, MAX_REPETICIONES } from "@/lib/domain/agenda";

export type TurnoActionResult = {
  ok: boolean;
  error?: string;
  waUrl?: string;
  /** Cantidad de turnos materializados por el alta (recurrencia semanal). */
  creados?: number;
};

const crearTurnoSchema = z.object({
  slug: z.string().min(1),
  cliente_nombre: z.string().trim().min(1, "Completá el nombre"),
  telefono: z.string().trim().optional(),
  servicio: z.string().trim().min(1, "Completá el servicio"),
  fecha: z.string().trim().min(1, "Completá la fecha"),
  hora: z.string().trim().min(1, "Completá la hora"),
  duracion: z.coerce.number().int().positive().optional(),
  notas: z.string().trim().optional(),
  // Lugar de la clase/prestación (rubro profesor): la columna ya existe en la
  // DB y es nullable, así que sin lugar se guarda null (no "").
  lugar: z.string().trim().optional(),
  // Recurrencia semanal: cuántas semanas se repite el turno (1 = turno solo).
  // El preprocess es obligatorio: el form manda "" cuando el campo está vacío
  // y z.coerce.number() convertiría "" en 0, rompiendo el alta de un turno
  // único.
  repetir: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(1).max(MAX_REPETICIONES).optional(),
  ),
  // Checkbox HTML: llega "on" cuando está marcado y ausente cuando no.
  avisar: z.string().optional(),
});

const completarTurnoSchema = z.object({
  slug: z.string().min(1),
  turno_id: z.string().min(1),
});

// Edición (#190): mismos campos y validaciones que el alta + el ancla del
// turno. `duracion` viaja oculta desde el modal para no pisar la original.
// `repetir` se hereda pero se IGNORA: editar un turno nunca crea turnos
// nuevos ("editar serie" queda fuera de alcance).
const actualizarTurnoSchema = crearTurnoSchema.extend({
  turno_id: z.string().min(1),
});

/** Acciones por id (cancelar / no vino / eliminar): solo slug + turno_id. */
const turnoIdSchema = z.object({
  slug: z.string().min(1),
  turno_id: z.string().min(1),
});

/**
 * Alta de turno (R9): valida con zod, inserta con estado "confirmado" y
 * revalida la ruta del shell. El waUrl del mensaje de confirmación (R3/R4)
 * solo se devuelve si hay teléfono Y el aviso está marcado (#179: en servicio
 * técnico el turno puede ser un compromiso interno sin notificación).
 *
 * Recurrencia semanal (rubro profesor): la serie se MATERIALIZA en N filas
 * reales —no hay entidad "serie"— así cada ocurrencia se ve en la agenda, se
 * puede editar/cancelar por separado y los recordatorios funcionan sin
 * cambios. Todas las filas van en UNA sola llamada a insert (una sentencia,
 * atómica): N inserts sueltos dejarían turnos a medio crear si falla uno.
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
  const avisar = input.avisar === "on";
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const veces = input.repetir ?? 1;
  const fechas = fechasRecurrentes(input.fecha, veces);
  // Fecha inválida: se mantiene el comportamiento de siempre (un solo insert
  // y que sea la DB la que rechace la fecha).
  const fechasSerie = fechas.length > 0 ? fechas : [input.fecha];

  const filas = fechasSerie.map((fecha) => ({
    negocio_id: negocio.id,
    cliente_nombre: input.cliente_nombre,
    telefono: input.telefono || "",
    servicio: input.servicio,
    fecha,
    hora: input.hora,
    duracion: input.duracion ?? 60,
    estado: "confirmado",
    notas: input.notas || "",
    lugar: input.lugar || null,
  }));

  const { error } = await supabase.from("turnos").insert(filas);
  if (error) {
    console.error("[crearTurno] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el turno." };
  }

  revalidatePath(`/${input.slug}`);

  let waUrl: string | undefined;
  if (input.telefono && avisar) {
    // Solo la PRIMERA fecha: una serie de N turnos no genera N mensajes.
    waUrl = buildWhatsAppLink(
      input.telefono,
      mensajeTurnoConfirmado(
        negocio.nombre,
        input.cliente_nombre,
        formatFecha(fechasSerie[0]),
        input.hora,
      ),
    );
  }

  return { ok: true, waUrl, creados: filas.length };
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

/**
 * Edición de un turno (#190 · ABM de la agenda): mismos campos que el alta
 * con el turno_id como ancla. El update queda scopeado al negocio y el waUrl
 * se arma con la misma regla que crearTurno (teléfono + avisar marcado), para
 * avisar del cambio solo si el dueño lo pidió.
 */
export async function actualizarTurno(
  _prev: TurnoActionResult,
  formData: FormData,
): Promise<TurnoActionResult> {
  const parsed = actualizarTurnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Completá todos los campos" };
  }
  const input = parsed.data;
  const avisar = input.avisar === "on";
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("turnos")
    .update({
      cliente_nombre: input.cliente_nombre,
      telefono: input.telefono || "",
      servicio: input.servicio,
      fecha: input.fecha,
      hora: input.hora,
      duracion: input.duracion ?? 60,
      notas: input.notas || "",
      lugar: input.lugar || null,
    })
    .eq("id", input.turno_id)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[actualizarTurno] update:", error.message);
    return { ok: false, error: "No se pudo guardar el turno." };
  }

  revalidatePath(`/${input.slug}`);

  let waUrl: string | undefined;
  if (input.telefono && avisar) {
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

/**
 * Cancela un turno (#190): el estado queda "cancelado" y la fila se conserva
 * en la agenda (con el nombre tachado) hasta que se elimine. El estado es
 * text en la DB, sin migración.
 */
export async function cancelarTurno(
  _prev: TurnoActionResult,
  formData: FormData,
): Promise<TurnoActionResult> {
  const parsed = turnoIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, turno_id: turnoId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("turnos")
    .update({ estado: "cancelado" })
    .eq("id", turnoId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[cancelarTurno] update:", error.message);
    return { ok: false, error: "No se pudo cancelar el turno." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Marca que el cliente no vino (#190). El estado "no_asistio" distingue una
 * ausencia de una cancelación avisada, y la fila se conserva para poder
 * recontactarlo o eliminarlo.
 */
export async function marcarNoAsistio(
  _prev: TurnoActionResult,
  formData: FormData,
): Promise<TurnoActionResult> {
  const parsed = turnoIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, turno_id: turnoId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("turnos")
    .update({ estado: "no_asistio" })
    .eq("id", turnoId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[marcarNoAsistio] update:", error.message);
    return { ok: false, error: "No se pudo marcar el turno." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/**
 * Elimina un turno (#190). Es la baja definitiva de la agenda: se ofrece solo
 * sobre turnos ya resueltos (cancelado / no vino) para no borrar por error un
 * turno vigente.
 */
export async function eliminarTurno(
  _prev: TurnoActionResult,
  formData: FormData,
): Promise<TurnoActionResult> {
  const parsed = turnoIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, turno_id: turnoId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("turnos")
    .delete()
    .eq("id", turnoId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[eliminarTurno] delete:", error.message);
    return { ok: false, error: "No se pudo eliminar el turno." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
