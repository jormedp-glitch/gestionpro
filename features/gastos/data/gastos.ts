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

/** Gasto del negocio (columnas usadas por la app). */
export interface Gasto {
  id: string;
  negocio_id: string;
  descripcion: string;
  monto: number;
  fecha: string | null;
  created_at: string;
}

/** Gastos del negocio (R8: lectura con el cliente server). */
export async function getGastosDeNegocio(negocioId: string): Promise<Gasto[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gastos")
    .select("*")
    .eq("negocio_id", negocioId);
  return (data ?? []) as Gasto[];
}
