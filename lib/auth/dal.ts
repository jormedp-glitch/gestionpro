import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Capa de acceso a datos con verificación de sesión y membresía (fase 1, WU-2).
 * Toda lectura protegida pasa por acá ANTES de tocar datos (spec: el proxy es
 * optimista; la aplicación real la hace el DAL + RLS).
 */

/**
 * Negocio del panel — fila real de la tabla `negocios` (types/database.types.ts,
 * snapshot PRE-rollout), recortada a las columnas que usa la app.
 * `activo` y `telefono_admin` quedan fuera del Pick: columnas legacy sin uso
 * (spec D3, documentado).
 */
export type Negocio = Pick<
  Tables<"negocios">,
  "id" | "nombre" | "slug" | "rubro" | "created_at"
>;

/** Usuario de la sesión actual (server), o null si no hay sesión. */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** True si `userId` es miembro (owner/editor) del negocio indicado. */
export async function isMember(userId: string, negocioId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("negocio_miembros")
    .select("negocio_id")
    .eq("user_id", userId)
    .eq("negocio_id", negocioId)
    .maybeSingle();
  return data !== null;
}

/**
 * Exige sesión + membresía en el negocio antes de continuar.
 * Sin sesión → /login; sin membresía → /. Devuelve el usuario de la sesión.
 */
export async function requireMembership(negocioId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await isMember(user.id, negocioId))) redirect("/");
  return user;
}

/**
 * Negocios del usuario actual (los que le pertenecen por membresía).
 * Sin sesión → /login. La lista sale filtrada por RLS (policy por membresía).
 */
export async function getOwnNegocios(): Promise<Negocio[]> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("negocios")
    .select("id, nombre, slug, rubro, created_at")
    .order("created_at", { ascending: false });

  return (data ?? []) as Negocio[];
}
