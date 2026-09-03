// features/clientes/data/clientes.ts
//
// Capa de datos del feature clientes (spec R8). Tipos y helpers de lectura
// server-side. El shell ([slug]/page.tsx) resuelve el negocio + membresía y
// pasa los datos como props a los client components; nunca se lee con el
// cliente browser (R11).
//
// Este módulo es server-only: los client components reciben los datos como
// props y los tipos via `import type` (se borra en compilación).

import { createClient } from "@/lib/supabase/server";

/** Cliente del negocio (columnas usadas por la app). */
export interface Cliente {
  id: string;
  negocio_id: string;
  nombre: string;
  telefono: string | null;
  plan: string;
  cuota: number;
  vence: string | null;
  estado: string;
  created_at: string;
}

/** Clientes del negocio (R8: lectura con el cliente server). */
export async function getClientesDeNegocio(
  negocioId: string,
): Promise<Cliente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("*")
    .eq("negocio_id", negocioId);
  return (data ?? []) as Cliente[];
}
