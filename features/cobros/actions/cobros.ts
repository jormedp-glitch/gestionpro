// features/cobros/actions/cobros.ts
//
// Server Actions del feature cobros (R10, R11). Registrar un cobro escribe en
// dos tablas: el cobro (historial) y el vencimiento del cliente; si el update
// del cliente falla se borra el cobro recién insertado (compensación) para no
// dejar un movimiento sin su efecto en la cuota. Toda escritura pasa por
// zod v4 → requireNegocio → supabase server → revalidatePath.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { proximoVencimiento } from "@/lib/domain/cuotas";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";

export type CobroActionResult = { ok: boolean; error?: string };

const registrarCobroSchema = z.object({
  slug: z.string().min(1),
  cliente_id: z.string().min(1),
  monto: z.coerce.number().positive("Completá todos los campos"),
  concepto: z.string().trim().optional(),
  medio_pago: z.enum(
    ["efectivo", "transferencia", "mercadopago", "otro"],
    "Medio de pago inválido",
  ),
  fecha: z.string().trim().min(1, "Completá todos los campos"),
});

/**
 * Registra un cobro (R10) y extiende el vencimiento del cliente (R11,
 * lib/domain/cuotas). Si el update del cliente falla se compensa borrando el
 * cobro: cuota e historial no pueden quedar desincronizados.
 */
export async function registrarCobro(
  _prev: CobroActionResult,
  formData: FormData,
): Promise<CobroActionResult> {
  const parsed = registrarCobroSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();

  const { data: cliente, error: errorCliente } = await supabase
    .from("clientes")
    .select("vence")
    .eq("id", input.cliente_id)
    .eq("negocio_id", negocio.id)
    .maybeSingle<{ vence: string | null }>();
  if (errorCliente || !cliente) {
    console.error(
      "[registrarCobro] select:",
      errorCliente?.message ?? "cliente no encontrado",
    );
    return { ok: false, error: "No se pudo registrar el cobro." };
  }

  const { data: cobro, error: errorCobro } = await supabase
    .from("cobros")
    .insert({
      negocio_id: negocio.id,
      cliente_id: input.cliente_id,
      monto: input.monto,
      concepto: input.concepto || null,
      medio_pago: input.medio_pago,
      fecha: input.fecha,
    })
    .select("id")
    .single();
  if (errorCobro) {
    console.error("[registrarCobro] insert:", errorCobro.message);
    return { ok: false, error: "No se pudo registrar el cobro." };
  }

  const hoy = new Date().toISOString().split("T")[0];
  const { error: errorUpdate } = await supabase
    .from("clientes")
    .update({
      vence: proximoVencimiento(cliente.vence, hoy),
      estado: "activo",
    })
    .eq("id", input.cliente_id)
    .eq("negocio_id", negocio.id);
  if (errorUpdate) {
    console.error("[registrarCobro] update:", errorUpdate.message);
    // Compensación (R11): sin el vencimiento actualizado el cobro no vale.
    const { error: errorCompensacion } = await supabase
      .from("cobros")
      .delete()
      .eq("id", cobro.id)
      .eq("negocio_id", negocio.id);
    if (errorCompensacion) {
      console.error(
        "[registrarCobro] compensación:",
        errorCompensacion.message,
      );
    }
    return { ok: false, error: "No se pudo registrar el cobro." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}
