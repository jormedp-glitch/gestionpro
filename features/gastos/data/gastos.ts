// features/gastos/data/gastos.ts
//
// Capa de datos del feature gastos (spec R8). Tipos y helpers de lectura
// server-side. El shell ([slug]/page.tsx) resuelve el negocio + membresía y
// pasa los datos como props a los client components; nunca se lee con el
// cliente browser (R11).
//
// Este módulo es server-only: los client components reciben los datos como
// props y los tipos via `import type` (se borra en compilación).

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Gasto del negocio — fila real de la tabla `gastos` (types/database.types.ts,
 * snapshot PRE-rollout). `fecha` es NOT NULL en la DB; `created_at` y
 * `negocio_id` son nullables (fidelidad al schema real).
 */
export type Gasto = Tables<"gastos">;

/** Gastos del negocio (R8: lectura con el cliente server). */
export async function getGastosDeNegocio(negocioId: string): Promise<Gasto[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gastos")
    .select("*")
    .eq("negocio_id", negocioId);
  return (data ?? []) as Gasto[];
}
