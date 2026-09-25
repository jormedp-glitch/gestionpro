// features/cobros/data/cobros.ts
//
// Capa de datos del feature cobros (R10, R12). Lectura server-side del
// historial de cobros por cliente (ficha del alumno) y por negocio (base del
// total del mes). El llamador ya resolvió negocio + membresía; acá solo se lee
// con el cliente server.
//
// Tipos manuales: types/database.types.ts es un snapshot PRE-rollout y no
// incluye `cobros` (regenerarlo es tarea posterior). Mismo criterio que
// features/clientes/data/clientes.ts con `Cliente`.

import { createClient } from "@/lib/supabase/server";

/** Cobro registrado (R10): historial por cliente y total del mes (R12). */
export interface Cobro {
  id: string;
  negocio_id: string;
  cliente_id: string;
  monto: number;
  concepto: string | null;
  medio_pago: string;
  fecha: string;
  created_at: string;
}

/** Historial de cobros del cliente (R10), más reciente primero. */
export async function getCobrosDeCliente(
  clienteId: string,
  negocioId: string,
): Promise<Cobro[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cobros")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("negocio_id", negocioId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Cobro[];
}

/** Cobros del negocio (R12: base del total del mes), más reciente primero. */
export async function getCobrosDeNegocio(negocioId: string): Promise<Cobro[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cobros")
    .select("*")
    .eq("negocio_id", negocioId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Cobro[];
}
