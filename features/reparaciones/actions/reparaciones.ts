// features/reparaciones/actions/reparaciones.ts
//
// Server Actions del feature reparaciones (spec R9/R10, A2/A3/A5).
// - Toda escritura privada pasa por acá: zod v4 → requireMembership →
//   supabase server → revalidatePath.
// - Las transiciones se validan contra el mapa del dominio (R2): la UI solo
//   ofrece siguientesEstados(actual) y el servidor rechaza lo no permitido.
// - El número de orden sale del RPC `generar_numero_orden` (migración 0001,
//   sin tocar; formato "0001" se conserva — R10).
// - Los links de WhatsApp se construyen con lib/domain/mensajes + wa.ts
//   (R3/R4); el cliente solo abre la URL devuelta. `crearReparacion` no
//   devuelve waUrl porque el mensaje de ingreso necesita el origin del
//   navegador (link de seguimiento) — lo arma el cliente con mensajeIngreso.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORIAS_EQUIPO,
  requireNegocio,
  getEquipoPorId,
} from "@/features/reparaciones/data/reparaciones";
import {
  TRANSICIONES,
  puedeTransicionar,
} from "@/lib/domain/estados-reparacion";
import type { EstadoReparacion } from "@/lib/domain/estados-reparacion";
import {
  mensajeListo,
  mensajePresupuesto,
  mensajeSinReparacion,
} from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";

export type ActionResult = { ok: boolean; error?: string };

export type CrearReparacionResult = ActionResult & {
  id?: string;
  acceso_token?: string;
  numero_orden?: string;
};

export type CambiarEstadoResult = ActionResult & { waUrl?: string };

/** Valida que el string sea un estado del dominio (clave de TRANSICIONES). */
const estadoSchema = z
  .string()
  .refine((v): v is EstadoReparacion => v in TRANSICIONES, "Estado inválido");

const crearReparacionSchema = z.object({
  slug: z.string().min(1),
  categoria: z.enum(CATEGORIAS_EQUIPO),
  problema_reportado: z.string().trim().min(1, "Describí el problema"),
  cliente_id: z.string().trim().optional(),
  cliente_nombre: z.string().trim().optional(),
  cliente_telefono: z.string().trim().optional(),
  marca: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  numero_serie: z.string().trim().optional(),
  accesorios: z.string().trim().optional(),
  tecnico_asignado: z.string().trim().optional(),
  fecha_estimada_entrega: z.string().trim().optional(),
  observaciones_internas: z.string().trim().optional(),
});

const cambiarEstadoSchema = z.object({
  slug: z.string().min(1),
  equipo_id: z.string().min(1),
  nuevo_estado: estadoSchema,
  comentario: z.string().trim().optional(),
});

const guardarPresupuestoSchema = z.object({
  slug: z.string().min(1),
  equipo_id: z.string().min(1),
  monto: z.coerce.number().positive("Ingresá un monto válido"),
});

const agregarRepuestoSchema = z.object({
  slug: z.string().min(1),
  equipo_id: z.string().min(1),
  descripcion: z.string().trim().min(1, "Ingresá una descripción"),
  costo: z.coerce.number().nonnegative(),
  precio_cobrado: z.coerce.number().nonnegative(),
  cantidad: z.coerce.number().int().positive(),
});

const eliminarRepuestoSchema = z.object({
  slug: z.string().min(1),
  repuesto_id: z.string().min(1),
});

const marcarEntregadoSchema = z.object({
  slug: z.string().min(1),
  equipo_id: z.string().min(1),
  precio_final: z.coerce.number().positive("Ingresá el precio final cobrado"),
});

/** Revalida las rutas del feature tras una mutación (R9). */
function revalidarReparaciones(slug: string, equipoId?: string) {
  revalidatePath(`/${slug}/reparaciones`);
  if (equipoId) revalidatePath(`/${slug}/reparaciones/${equipoId}`);
  revalidatePath(`/${slug}`);
}

/** Nombre visible del equipo para los mensajes (misma composición que antes). */
function nombreEquipo(equipo: {
  categoria: string;
  marca: string | null;
}): string {
  return equipo.categoria + (equipo.marca ? " " + equipo.marca : "");
}

/**
 * Alta de reparación: cliente nuevo opcional → RPC generar_numero_orden →
 * insert equipo + historial → revalidatePath (R9/R10).
 */
export async function crearReparacion(
  _prev: CrearReparacionResult,
  formData: FormData,
): Promise<CrearReparacionResult> {
  const parsed = crearReparacionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Completá los campos obligatorios." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  // 1. Cliente nuevo: se crea si viene nombre sin id (mismo comportamiento).
  let clienteId = input.cliente_id || null;
  if (!clienteId && input.cliente_nombre) {
    const { data: nuevoCliente, error: errorCliente } = await supabase
      .from("clientes")
      .insert({
        negocio_id: negocio.id,
        nombre: input.cliente_nombre,
        telefono: input.cliente_telefono ?? "",
        estado: "activo",
      })
      .select("id")
      .single();
    if (errorCliente) {
      console.error("[crearReparacion] cliente:", errorCliente.message);
      return { ok: false, error: "No se pudo guardar el cliente." };
    }
    clienteId = nuevoCliente.id;
  }

  // 2. Número de orden vía RPC (R10, formato "0001" se conserva).
  const { data: ordenData, error: errorOrden } = await supabase.rpc(
    "generar_numero_orden",
    { p_negocio_id: negocio.id },
  );
  if (errorOrden) {
    console.error("[crearReparacion] rpc:", errorOrden.message);
    return { ok: false, error: "No se pudo generar el número de orden." };
  }
  const numeroOrden = ordenData as string;

  // 3. Insert del equipo.
  const { data: equipo, error: errorEquipo } = await supabase
    .from("equipos")
    .insert({
      negocio_id: negocio.id,
      cliente_id: clienteId,
      numero_orden: numeroOrden,
      categoria: input.categoria,
      marca: input.marca || null,
      modelo: input.modelo || null,
      numero_serie: input.numero_serie || null,
      problema_reportado: input.problema_reportado,
      accesorios: input.accesorios || null,
      tecnico_asignado: input.tecnico_asignado || null,
      fecha_estimada_entrega: input.fecha_estimada_entrega || null,
      observaciones_internas: input.observaciones_internas || null,
      estado: "recibido",
    })
    .select("id, acceso_token")
    .single();
  if (errorEquipo) {
    console.error("[crearReparacion] equipo:", errorEquipo.message);
    return { ok: false, error: "No se pudo guardar la reparación." };
  }

  // 4. Primer historial (no bloqueante: el equipo ya quedó creado).
  const { error: errorHistorial } = await supabase
    .from("reparaciones_historial")
    .insert({
      equipo_id: equipo.id,
      negocio_id: negocio.id,
      estado_anterior: null,
      estado_nuevo: "recibido",
      comentario: "Equipo ingresado al taller",
      usuario: "sistema",
    });
  if (errorHistorial) {
    console.error("[crearReparacion] historial:", errorHistorial.message);
  }

  revalidarReparaciones(input.slug);
  return {
    ok: true,
    id: equipo.id,
    acceso_token: equipo.acceso_token,
    numero_orden: numeroOrden,
  };
}

/**
 * Cambio de estado: rechaza transiciones no permitidas por el mapa (R2) y
 * arma el WhatsApp de listo/sin_reparacion para que el cliente lo abra.
 */
export async function cambiarEstado(
  _prev: CambiarEstadoResult,
  formData: FormData,
): Promise<CambiarEstadoResult> {
  const parsed = cambiarEstadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, equipo_id: equipoId, nuevo_estado, comentario } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const equipo = await getEquipoPorId(negocio.id, equipoId);
  if (!equipo) return { ok: false, error: "Reparación no encontrada." };

  // R2: solo transiciones permitidas por el mapa de transiciones.
  if (!puedeTransicionar(equipo.estado, nuevo_estado)) {
    return { ok: false, error: "La transición no está permitida." };
  }

  const { error: errorUpdate } = await supabase
    .from("equipos")
    .update({ estado: nuevo_estado })
    .eq("id", equipoId)
    .eq("negocio_id", negocio.id);
  if (errorUpdate) {
    console.error("[cambiarEstado] update:", errorUpdate.message);
    return { ok: false, error: "No se pudo actualizar el estado." };
  }

  const { error: errorHistorial } = await supabase
    .from("reparaciones_historial")
    .insert({
      equipo_id: equipoId,
      negocio_id: negocio.id,
      estado_anterior: equipo.estado,
      estado_nuevo: nuevo_estado,
      comentario: comentario || null,
      usuario: "técnico",
    });
  if (errorHistorial) {
    console.error("[cambiarEstado] historial:", errorHistorial.message);
  }

  revalidarReparaciones(slug, equipoId);

  // WhatsApp automático para estados clave (R3 + wa.ts).
  let waUrl: string | undefined;
  const cliente = equipo.clientes;
  if (cliente?.telefono) {
    const nombre = cliente.nombre || "cliente";
    const equipoNombre = nombreEquipo(equipo);
    if (nuevo_estado === "listo_para_retirar") {
      const precio = Number(equipo.precio_final || equipo.presupuesto || 0);
      waUrl = buildWhatsAppLink(
        cliente.telefono,
        mensajeListo(nombre, equipoNombre, precio),
      );
    } else if (nuevo_estado === "sin_reparacion") {
      waUrl = buildWhatsAppLink(
        cliente.telefono,
        mensajeSinReparacion(nombre, equipoNombre),
      );
    }
  }

  return { ok: true, waUrl };
}

/**
 * Carga de presupuesto: pasa el equipo a presupuesto_enviado. A5: rechaza
 * desde estados que no permiten esa transición (p. ej. recibido).
 */
export async function guardarPresupuesto(
  _prev: CambiarEstadoResult,
  formData: FormData,
): Promise<CambiarEstadoResult> {
  const parsed = guardarPresupuestoSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { ok: false, error: "Ingresá un monto válido." };
  }
  const { slug, equipo_id: equipoId, monto } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const equipo = await getEquipoPorId(negocio.id, equipoId);
  if (!equipo) return { ok: false, error: "Reparación no encontrada." };

  if (!puedeTransicionar(equipo.estado, "presupuesto_enviado")) {
    return {
      ok: false,
      error: "El presupuesto no se puede cargar desde este estado.",
    };
  }

  const { error } = await supabase
    .from("equipos")
    .update({ presupuesto: monto, estado: "presupuesto_enviado" })
    .eq("id", equipoId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[guardarPresupuesto] update:", error.message);
    return { ok: false, error: "No se pudo guardar el presupuesto." };
  }

  const { error: errorHistorial } = await supabase
    .from("reparaciones_historial")
    .insert({
      equipo_id: equipoId,
      negocio_id: negocio.id,
      estado_anterior: equipo.estado,
      estado_nuevo: "presupuesto_enviado",
      comentario: `Presupuesto cargado: $${monto}`,
      usuario: "técnico",
    });
  if (errorHistorial) {
    console.error("[guardarPresupuesto] historial:", errorHistorial.message);
  }

  revalidarReparaciones(slug, equipoId);

  let waUrl: string | undefined;
  const cliente = equipo.clientes;
  if (cliente?.telefono) {
    waUrl = buildWhatsAppLink(
      cliente.telefono,
      mensajePresupuesto(
        cliente.nombre || "cliente",
        nombreEquipo(equipo),
        monto,
      ),
    );
  }

  return { ok: true, waUrl };
}

/** Agrega un repuesto a la reparación. */
export async function agregarRepuesto(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = agregarRepuestoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const {
    slug,
    equipo_id: equipoId,
    descripcion,
    costo,
    precio_cobrado,
    cantidad,
  } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const equipo = await getEquipoPorId(negocio.id, equipoId);
  if (!equipo) return { ok: false, error: "Reparación no encontrada." };

  const { error } = await supabase.from("reparaciones_repuestos").insert({
    equipo_id: equipoId,
    negocio_id: negocio.id,
    descripcion,
    costo,
    precio_cobrado,
    cantidad,
  });
  if (error) {
    console.error("[agregarRepuesto] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el repuesto." };
  }

  revalidarReparaciones(slug, equipoId);
  return { ok: true };
}

/**
 * Elimina un repuesto de la reparación (scopeado al negocio). Firma de una
 * sola entrada y retorno void para uso directo como action de un <form>;
 * los errores se registran en el servidor (mismo comportamiento silencioso
 * que el page anterior).
 */
export async function eliminarRepuesto(formData: FormData): Promise<void> {
  const parsed = eliminarRepuestoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.error("[eliminarRepuesto] datos inválidos");
    return;
  }
  const { slug, repuesto_id: repuestoId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data: repuesto } = await supabase
    .from("reparaciones_repuestos")
    .select("equipo_id")
    .eq("id", repuestoId)
    .maybeSingle<{ equipo_id: string }>();
  if (!repuesto) return;

  const equipo = await getEquipoPorId(negocio.id, repuesto.equipo_id);
  if (!equipo) return;

  const { error } = await supabase
    .from("reparaciones_repuestos")
    .delete()
    .eq("id", repuestoId);
  if (error) {
    console.error("[eliminarRepuesto] delete:", error.message);
    return;
  }

  revalidarReparaciones(slug, equipo.id);
}

/** Marca el equipo como entregado con el precio final cobrado (R2). */
export async function marcarEntregado(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = marcarEntregadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Ingresá el precio final cobrado." };
  }
  const { slug, equipo_id: equipoId, precio_final } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const equipo = await getEquipoPorId(negocio.id, equipoId);
  if (!equipo) return { ok: false, error: "Reparación no encontrada." };

  if (!puedeTransicionar(equipo.estado, "entregado")) {
    return { ok: false, error: "El equipo no está listo para entregar." };
  }

  const { error } = await supabase
    .from("equipos")
    .update({
      estado: "entregado",
      precio_final,
      fecha_entrega: new Date().toISOString(),
    })
    .eq("id", equipoId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[marcarEntregado] update:", error.message);
    return { ok: false, error: "No se pudo marcar como entregado." };
  }

  const { error: errorHistorial } = await supabase
    .from("reparaciones_historial")
    .insert({
      equipo_id: equipoId,
      negocio_id: negocio.id,
      estado_anterior: equipo.estado,
      estado_nuevo: "entregado",
      comentario: `Equipo entregado. Cobrado: $${precio_final}`,
      usuario: "técnico",
    });
  if (errorHistorial) {
    console.error("[marcarEntregado] historial:", errorHistorial.message);
  }

  revalidarReparaciones(slug, equipoId);
  return { ok: true };
}
