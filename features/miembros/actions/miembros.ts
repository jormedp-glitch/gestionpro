// features/miembros/actions/miembros.ts
//
// Server Actions del feature miembros (spec R1–R7, design D2/D4/D6). Toda
// mutación pasa por acá: zod v4 → requireNegocio + requireOwner (R6) →
// admin API / RPC → revalidatePath. La contraseña temporal se genera acá
// (lib/domain/contrasena), se devuelve UNA sola vez en el resultado del alta
// y nunca se persiste (D6). El CRUD de membresías va SOLO por RPC security
// definer (los grants de 0001:33-34 solo permiten SELECT; mutaciones
// inalcanzables por PostgREST salvo vía RPC).

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createUserWithPassword, deleteUser } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireNegocio } from "@/lib/server/negocio";
import { requireOwner } from "@/lib/auth/dal";
import { generarContrasenaTemporal } from "@/lib/domain/contrasena";
import { getMiembrosDeNegocio } from "@/features/miembros/data/miembros";
import type { Miembro } from "@/features/miembros/data/miembros";

export type MiembroActionResult = { ok: boolean; error?: string };

/** Resultado del alta: la contraseña temporal viaja UNA vez en `contrasena_temporal`. */
export type CrearUsuarioResult = MiembroActionResult & {
  contrasena_temporal?: string;
};

const crearUsuarioSchema = z.object({
  slug: z.string().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresá un email válido")),
  rol: z.enum(["owner", "editor"], "Rol inválido"),
});

const cambiarRolSchema = z.object({
  slug: z.string().min(1),
  user_id: z.string().min(1),
  rol: z.enum(["owner", "editor"], "Rol inválido"),
});

const quitarMiembroSchema = z.object({
  slug: z.string().min(1),
  user_id: z.string().min(1),
});

/**
 * Mensaje de error para el usuario: los raise exception del RPC (0005)
 * llegan con code P0001 y mensajes claros en español (R5: "No se puede
 * quitar/demotar al último owner"; R7: "El email ya es miembro del
 * negocio"). El resto de errores (infraestructura) → mensaje genérico.
 */
function mensajeRpc(error: { code?: string; message: string }): string {
  return error.code === "P0001"
    ? error.message
    : "No se pudo completar la operación.";
}

/**
 * True si el error de createUser significa "el email ya tiene cuenta auth"
 * (R7, self-heal). El enum ErrorCode de @supabase/auth-js v2 (instalado
 * 2.114.0) lista AMBOS códigos: `user_already_exists` y `email_exists`
 * (el server puede devolver cualquiera según versión); el status HTTP es 422.
 */
function esErrorEmailExistente(error: { code?: string }): boolean {
  return error.code === "user_already_exists" || error.code === "email_exists";
}

/**
 * Alta de usuario auth + membresía (R1, orden usuario → membresía):
 *   1. createUserWithPassword (admin API, email_confirm: true).
 *   2. RPC agregar_miembro (inserta la membresía del negocio).
 * Si el paso 2 falla, compensa borrando el usuario auth creado (nunca deja
 * un usuario huérfano sin membresía). Si el email ya tiene cuenta (R7), no
 * crea ni borra nada: solo inserta la membresía (self-heal del huérfano de
 * una compensación fallida: re-invitar el mismo email cura la membresía).
 */
export async function crearUsuario(
  _prev: CrearUsuarioResult,
  formData: FormData,
): Promise<CrearUsuarioResult> {
  const parsed = crearUsuarioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Email o rol inválidos." };
  }
  const { slug, email, rol } = parsed.data;

  const negocio = await requireNegocio(slug);
  await requireOwner(negocio.id);

  const supabase = await createClient();
  const contrasena = generarContrasenaTemporal();

  // 1. Crear el usuario auth (R1). Self-heal: si el email ya está
  // registrado (R7), no se intenta crear de nuevo — solo la membresía.
  const { data: usuario, error: errorUsuario } = await createUserWithPassword(
    email,
    contrasena,
  );

  if (errorUsuario) {
    if (esErrorEmailExistente(errorUsuario)) {
      const { error: errorMembresia } = await supabase.rpc("agregar_miembro", {
        p_negocio_id: negocio.id,
        p_email: email,
        p_rol: rol,
      });
      if (errorMembresia) {
        console.error(
          "[crearUsuario] rpc agregar_miembro (self-heal):",
          errorMembresia.message,
        );
        return { ok: false, error: mensajeRpc(errorMembresia) };
      }
      revalidatePath(`/${slug}/usuarios`);
      // El usuario ya tenía su propia contraseña: no se devuelve la temporal.
      return { ok: true };
    }
    console.error("[crearUsuario] createUser:", errorUsuario.message);
    return { ok: false, error: "No se pudo crear el usuario." };
  }

  const userId = usuario?.user?.id;
  if (!userId) {
    console.error("[crearUsuario] createUser sin id de usuario");
    return { ok: false, error: "No se pudo crear el usuario." };
  }

  // 2. Insertar la membresía (R1, FK user_id → auth.users 0001:23).
  const { error: errorMembresia } = await supabase.rpc("agregar_miembro", {
    p_negocio_id: negocio.id,
    p_email: email,
    p_rol: rol,
  });
  if (errorMembresia) {
    console.error(
      "[crearUsuario] rpc agregar_miembro:",
      errorMembresia.message,
    );
    // Compensación (R1): nunca dejar un usuario auth sin membresía.
    const { error: errorCompensacion } = await deleteUser(userId);
    if (errorCompensacion) {
      // La compensación también falló: queda un huérfano. Se loguea para
      // limpieza operativa y se devuelve el error ORIGINAL del RPC
      // (self-heal: re-invitar el mismo email cura la membresía).
      console.error(
        "[crearUsuario] compensación deleteUser:",
        errorCompensacion.message,
      );
    }
    return { ok: false, error: mensajeRpc(errorMembresia) };
  }

  revalidatePath(`/${slug}/usuarios`);
  // La contraseña temporal se devuelve UNA sola vez en el resultado (D6);
  // nunca se persiste.
  return { ok: true, contrasena_temporal: contrasena };
}

/**
 * Miembros del negocio (R2), llamada server→server desde la page de
 * usuarios: requireNegocio + requireOwner ANTES de leer (R6: editores y
 * no-miembros no disparan la lectura — redirigen antes).
 */
export async function listarMiembros(slug: string): Promise<Miembro[]> {
  const negocio = await requireNegocio(slug);
  await requireOwner(negocio.id);
  return getMiembrosDeNegocio(negocio.id);
}

/** Cambia el rol de un miembro (R3; R5 lo protege en el RPC). */
export async function cambiarRol(
  _prev: MiembroActionResult,
  formData: FormData,
): Promise<MiembroActionResult> {
  const parsed = cambiarRolSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, user_id: userId, rol } = parsed.data;

  const negocio = await requireNegocio(slug);
  await requireOwner(negocio.id);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_rol_miembro", {
    p_negocio_id: negocio.id,
    p_user_id: userId,
    p_rol: rol,
  });
  if (error) {
    console.error("[cambiarRol] rpc cambiar_rol_miembro:", error.message);
    return { ok: false, error: mensajeRpc(error) };
  }

  revalidatePath(`/${slug}/usuarios`);
  return { ok: true };
}

/** Quita un miembro del negocio (R4; R5 lo protege en el RPC). */
export async function quitarMiembro(
  _prev: MiembroActionResult,
  formData: FormData,
): Promise<MiembroActionResult> {
  const parsed = quitarMiembroSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { slug, user_id: userId } = parsed.data;

  const negocio = await requireNegocio(slug);
  await requireOwner(negocio.id);

  const supabase = await createClient();
  const { error } = await supabase.rpc("quitar_miembro", {
    p_negocio_id: negocio.id,
    p_user_id: userId,
  });
  if (error) {
    console.error("[quitarMiembro] rpc quitar_miembro:", error.message);
    return { ok: false, error: mensajeRpc(error) };
  }

  revalidatePath(`/${slug}/usuarios`);
  return { ok: true };
}
