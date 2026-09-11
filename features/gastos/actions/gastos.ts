// features/gastos/actions/gastos.ts
//
// Server Actions del feature gastos (spec R9). Toda escritura privada pasa
// por acá: zod v4 → requireNegocio → supabase server → revalidatePath.

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";

export type GastoActionResult = { ok: boolean; error?: string };

const agregarGastoSchema = z.object({
  slug: z.string().min(1),
  descripcion: z.string().trim().min(1, "Completá el gasto"),
  monto: z.coerce.number().positive("Completá el gasto"),
  fecha: z.string().trim().optional(),
});

const eliminarGastoSchema = z.object({
  slug: z.string().min(1),
  gasto_id: z.string().min(1),
});

/** Alta de gasto (R9): inserta con fecha de hoy si no se informa. */
export async function agregarGasto(
  _prev: GastoActionResult,
  formData: FormData,
): Promise<GastoActionResult> {
  const parsed = agregarGastoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Completá el gasto" };
  }
  const input = parsed.data;
  const negocio = await requireNegocio(input.slug);
  const supabase = await createClient();
  const hoy = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("gastos").insert({
    negocio_id: negocio.id,
    descripcion: input.descripcion,
    monto: input.monto,
    fecha: input.fecha || hoy,
  });
  if (error) {
    console.error("[agregarGasto] insert:", error.message);
    return { ok: false, error: "No se pudo guardar el gasto." };
  }

  revalidatePath(`/${input.slug}`);
  return { ok: true };
}

/** Elimina un gasto del negocio (R9, mismo comportamiento que el monolito). */
export async function eliminarGasto(
  _prev: GastoActionResult,
  formData: FormData,
): Promise<GastoActionResult> {
  const parsed = eliminarGastoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, gasto_id: gastoId } = parsed.data;
  const negocio = await requireNegocio(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("gastos")
    .delete()
    .eq("id", gastoId)
    .eq("negocio_id", negocio.id);
  if (error) {
    console.error("[eliminarGasto] delete:", error.message);
    return { ok: false, error: "No se pudo eliminar el gasto." };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}
