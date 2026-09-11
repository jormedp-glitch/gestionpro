// lib/server/negocio.ts
//
// Helpers server del dominio negocio (A8: reusa el DAL de Fase 1). Las
// lecturas privadas pasan por acá con el cliente server; el control de
// sesión/membresía lo decide el caller (requireMembership del DAL).

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/auth/dal";
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

/**
 * Resuelve el negocio por slug y exige membresía (DAL fase 1, A8). Sin
 * sesión redirige a /login; sin membresía a /; slug inexistente → 404.
 * Versión compartida del shell y de las Server Actions (PR3).
 */
export async function requireNegocio(slug: string): Promise<Negocio> {
  const negocio = await getNegocioBySlug(slug);
  if (!negocio) notFound();
  await requireMembership(negocio.id);
  return negocio;
}
