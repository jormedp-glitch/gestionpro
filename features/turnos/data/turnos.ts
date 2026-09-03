// features/turnos/data/turnos.ts
//
// Capa de datos del feature turnos (spec R8). Tipos y helpers de lectura
// server-side. El shell ([slug]/page.tsx) resuelve el negocio + membresía y
// pasa los datos como props a los client components; nunca se lee con el
// cliente browser (R11).
//
// Este módulo es server-only: los client components reciben los datos como
// props y los tipos via `import type` (se borra en compilación).

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Turno de la agenda — fila real de la tabla `turnos` (types/database.types.ts,
 * snapshot PRE-rollout). `duracion` y `estado` son nullables en la DB; los
 * client components los renderizan con ReactNode (aceptan null).
 */
export type Turno = Tables<"turnos">;

/** Turnos del negocio (R8: lectura con el cliente server). */
export async function getTurnosDeNegocio(negocioId: string): Promise<Turno[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("turnos")
    .select("*")
    .eq("negocio_id", negocioId);
  return (data ?? []) as Turno[];
}
