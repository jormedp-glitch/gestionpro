// features/portal/actions/portal.ts
//
// Server Actions del portal público del alumno (R13–R15): validan el
// formulario con zod y llaman a los RPC `security definer` de la migración
// 0007 con el cliente server (rol anon — el token es la capacidad, AD-2).
// NO leen tablas ni usan el cliente browser (R15). Los retornos del RPC se
// traducen a un resultado con mensaje: `no_disponible` nunca revela si el
// token existe (sin oráculo, escenario 11) y `plan_completo` avisa que no hay
// más sesiones (R6).

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  completadoPortalSchema,
  tokenPortalSchema,
  type PortalMutacion,
} from "@/features/portal/contrato";

export type PortalActionResult = { ok: boolean; error?: string };

/** Mensaje único para token inválido y para actividad no autorizada. */
const NO_DISPONIBLE =
  "Este link ya no está disponible. Pedile uno nuevo a tu profe.";

/** Traduce el jsonb del RPC a un resultado de Server Action. */
function traducirResultado(
  data: PortalMutacion | null,
  error: { message: string } | null,
): PortalActionResult {
  if (error || !data) {
    console.error("[portal] rpc:", error?.message ?? "sin datos");
    return {
      ok: false,
      error: "No se pudo completar la acción. Probá de nuevo.",
    };
  }
  if (data.ok) return { ok: true };
  return {
    ok: false,
    error:
      data.motivo === "plan_completo"
        ? "Ya completaste todas las sesiones del plan."
        : NO_DISPONIBLE,
  };
}

/** Marca una actividad de la rutina activa como hecha (AD-5, idempotente). */
export async function marcarCompletadoPortal(
  _prev: PortalActionResult,
  formData: FormData,
): Promise<PortalActionResult> {
  const parsed = completadoPortalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: NO_DISPONIBLE };
  const { slug, token, rutina_ejercicio_id: actividadId, fecha } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("marcar_completado_portal", {
    p_token: token,
    p_rutina_ejercicio_id: actividadId,
    p_fecha: fecha,
  });

  const resultado = traducirResultado(data as PortalMutacion | null, error);
  if (resultado.ok) revalidatePath(`/${slug}/portal/${token}`);
  return resultado;
}

/** Deshace el completado de una actividad (AD-5, idempotente). */
export async function desmarcarCompletadoPortal(
  _prev: PortalActionResult,
  formData: FormData,
): Promise<PortalActionResult> {
  const parsed = completadoPortalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: NO_DISPONIBLE };
  const { slug, token, rutina_ejercicio_id: actividadId, fecha } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("desmarcar_completado_portal", {
    p_token: token,
    p_rutina_ejercicio_id: actividadId,
    p_fecha: fecha,
  });

  const resultado = traducirResultado(data as PortalMutacion | null, error);
  if (resultado.ok) revalidatePath(`/${slug}/portal/${token}`);
  return resultado;
}

/** Avanza la sesión actual de la rutina activa (R6, tope en el total). */
export async function avanzarSesionPortal(
  _prev: PortalActionResult,
  formData: FormData,
): Promise<PortalActionResult> {
  const parsed = tokenPortalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: NO_DISPONIBLE };
  const { slug, token } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("avanzar_sesion_portal", {
    p_token: token,
  });

  const resultado = traducirResultado(data as PortalMutacion | null, error);
  if (resultado.ok) revalidatePath(`/${slug}/portal/${token}`);
  return resultado;
}
