// lib/server/negocio.ts
//
// Helpers server del dominio negocio (A8: reusa el DAL de Fase 1). Las
// lecturas privadas pasan por acá con el cliente server; el control de
// sesión/membresía lo decide el caller (requireMembership del DAL).

import { createClient } from "@/lib/supabase/server";
import type { Negocio } from "@/lib/auth/dal";

/** Negocio por slug usando el cliente server (null si no existe / sin acceso). */
export async function getNegocioBySlug(slug: string): Promise<Negocio | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("negocios")
    .select("id, nombre, slug, rubro, created_at")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Negocio | null) ?? null;
}
