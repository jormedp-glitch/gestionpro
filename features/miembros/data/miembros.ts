// features/miembros/data/miembros.ts
//
// Capa de datos del feature miembros (spec R2). Lectura server-side del
// listado de miembros vía RPC security definer (0005): el SELECT directo de
// negocio_miembros no incluye email y la policy miembros_propios impide
// listar incluso al owner → la única vía es `listar_miembros`.
//
// Este módulo es server-only: los client components reciben los datos como
// props y los tipos via `import type` (se borra en compilación).

import { createClient } from "@/lib/supabase/server";

/** Miembro del negocio (salida del RPC listar_miembros, 0005). */
export interface Miembro {
  user_id: string;
  email: string;
  rol: string;
  created_at: string;
}

/**
 * Miembros del negocio con email (R2), vía RPC `listar_miembros`
 * (security definer; owner-only validado DENTRO del RPC, R6). El llamador
 * ya pasó requireNegocio/requireOwner (la page o listarMiembros) — acá solo
 * se lee con el cliente server.
 */
export async function getMiembrosDeNegocio(
  negocioId: string,
): Promise<Miembro[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("listar_miembros", {
    p_negocio_id: negocioId,
  });
  return (data ?? []) as Miembro[];
}
