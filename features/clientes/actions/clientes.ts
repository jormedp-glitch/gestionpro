// features/clientes/actions/clientes.ts
//
// Server Actions del feature clientes (spec R9). Toda escritura privada pasa
// por acá: zod v4 → requireNegocio → supabase server → revalidatePath. El
// WhatsApp de cobro se arma en el cliente con lib/domain/mensajes + wa.ts
// (R3/R4) — no requiere round-trip al servidor.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { proximoVencimiento } from "@/lib/domain/cuotas";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";

export type ClienteActionResult = { ok: boolean; error?: string };

const agregarClienteSchema = z.object({
  slug: z.string().min(1),
  nombre: z.string().trim().min(1, "Completá todos los campos"),
  telefono: z.string().trim().optional(),
  plan: z.string().trim().min(1, "Completá todos los campos"),
  cuota: z.coerce.number().positive("Completá todos los campos"),
  vence: z.string().trim().optional(),
});

const pagarClienteSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
});

const eliminarClienteSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
});

/**
 * Alta de cliente (R9): inserta con estado "activo" y vence = hoy si no se
 * informa. Revalida la ruta del shell.
 */
export async function agregarCliente(
  _prev: ClienteActionResult,
  formData: FormData,
): Promise<ClienteActionResult> {
  const parsed = agregarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Completá todos los campos" };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();
  const hoy = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("clientes").insert({
    negocio_id: negocio.id,
    nombre: input.nombre,
    telefono: input.telefono || "",
    plan: input.plan,
    cuota: input.cuota,
    vence: input.vence || hoy,
    estado: "activo",
  });
  if (error) {
    console.error("[agregarCliente] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el cliente." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/**
 * Registra el cobro (R9): extiende el `vence` al próximo período
 * (lib/domain/cuotas, issue #78) y marca "activo" (el estado de la vista se
 * deriva del vence al leer).
 */
export async function pagarCliente(
  _prev: ClienteActionResult,
  formData: FormData,
): Promise<ClienteActionResult> {
  const parsed = pagarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, cliente_id: clienteId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { data: actual, error: selectError } = await supabase
    .from("clientes")
    .select("vence")
    .eq("id", clienteId)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ vence: string | null }>();
  if (selectError || !actual) {
    console.error(
      "[pagarCliente] select:",
      selectError?.message ?? "cliente no encontrado",
    );
    return { ok: false, error: "No se pudo registrar el pago." };
  }

  const hoy = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("clientes")
    .update({ estado: "activo", vence: proximoVencimiento(actual.vence, hoy) })
    .eq("id", clienteId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[pagarCliente] update:", error.message);
    return { ok: false, error: "No se pudo registrar el pago." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

/** Elimina un cliente del negocio (R9, mismo comportamiento que el monolito). */
export async function eliminarCliente(
  _prev: ClienteActionResult,
  formData: FormData,
): Promise<ClienteActionResult> {
  const parsed = eliminarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, cliente_id: clienteId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", clienteId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[eliminarCliente] delete:", error.message);
    return { ok: false, error: "No se pudo eliminar el cliente." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
