// features/reparaciones/data/reparaciones.ts
//
// Capa de datos del feature reparaciones (spec R8/R12, A7). Tipos y helpers
// de lectura server-side. La membresía se valida con requireMembership del
// DAL (fase 1) ANTES de tocar datos (el proxy es optimista; la aplicación
// real la hace el DAL + RLS).
//
// Este módulo es server-only: los client components NUNCA lo importan
// (reciben tipos via `import type`, que se borra en compilación, y datos
// como props desde los Server Components).

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMembership } from "@/lib/auth/dal";
import type { Negocio } from "@/lib/auth/dal";
import { getNegocioBySlug } from "@/lib/server/negocio";
import type { EstadoReparacion } from "@/lib/domain/estados-reparacion";

/**
 * Categorías de equipo — única fuente (antes en lib/types-reparaciones, R12).
 * `as const` permite usarlas directo en `z.enum` (Server Actions) y como
 * prop de los componentes.
 */
export const CATEGORIAS_EQUIPO = [
  "PC / Desktop",
  "Notebook",
  "Celular",
  "Tablet",
  "TV",
  "Impresora",
  "Parlante / Audio",
  "Consola",
  "Otro",
] as const;

export type CategoriaEquipo = (typeof CATEGORIAS_EQUIPO)[number];

/** Equipo en el taller (antes lib/types-reparaciones, R12). */
export interface Equipo {
  id: string;
  negocio_id: string;
  cliente_id: string | null;
  numero_orden: string;
  categoria: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  problema_reportado: string;
  accesorios: string | null;
  fecha_ingreso: string;
  fecha_estimada_entrega: string | null;
  estado: EstadoReparacion;
  tecnico_asignado: string | null;
  presupuesto: number | null;
  presupuesto_aceptado: boolean | null;
  precio_final: number | null;
  fecha_entrega: string | null;
  observaciones_internas: string | null;
  created_at: string;
}

/** Equipo con join de cliente (nombre/telefono) en lecturas del feature. */
export interface EquipoConCliente extends Equipo {
  clientes: { nombre: string; telefono: string } | null;
}

/** Entrada del historial de una reparación. */
export interface HistorialReparacion {
  id: string;
  equipo_id: string;
  negocio_id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  comentario: string | null;
  fecha: string;
  usuario: string | null;
}

/** Repuesto cargado a una reparación. */
export interface RepuestoReparacion {
  id: string;
  equipo_id: string;
  negocio_id: string;
  descripcion: string;
  costo: number;
  precio_cobrado: number;
  cantidad: number;
}

/** Cliente para el selector del formulario de alta. */
export interface ClienteOpcion {
  id: string;
  nombre: string;
  telefono: string;
}

/**
 * Resuelve el negocio por slug y exige membresía (DAL fase 1, A8). Sin
 * sesión redirige a /login; sin membresía a /; slug inexistente → 404.
 */
export async function requireNegocio(slug: string): Promise<Negocio> {
  const negocio = await getNegocioBySlug(slug);
  if (!negocio) notFound();
  await requireMembership(negocio.id);
  return negocio;
}

/** Equipos del negocio con join de cliente, más recientes primero (R8). */
export async function getEquiposDeNegocio(
  negocioId: string,
): Promise<EquipoConCliente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipos")
    .select("*, clientes(nombre, telefono)")
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EquipoConCliente[];
}

/** Equipo por id scopeado al negocio (evita lecturas cross-negocio). */
export async function getEquipoPorId(
  negocioId: string,
  equipoId: string,
): Promise<EquipoConCliente | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipos")
    .select("*, clientes(nombre, telefono)")
    .eq("id", equipoId)
    .eq("negocio_id", negocioId)
    .maybeSingle();
  return (data as EquipoConCliente | null) ?? null;
}

/** Detalle completo: equipo + historial (reciente primero) + repuestos. */
export async function getEquipoDetalle(
  negocioId: string,
  equipoId: string,
): Promise<{
  equipo: EquipoConCliente | null;
  historial: HistorialReparacion[];
  repuestos: RepuestoReparacion[];
}> {
  const supabase = await createClient();
  const [equipo, historial, repuestos] = await Promise.all([
    supabase
      .from("equipos")
      .select("*, clientes(nombre, telefono)")
      .eq("id", equipoId)
      .eq("negocio_id", negocioId)
      .maybeSingle(),
    supabase
      .from("reparaciones_historial")
      .select("*")
      .eq("equipo_id", equipoId)
      .eq("negocio_id", negocioId)
      .order("fecha", { ascending: false }),
    supabase
      .from("reparaciones_repuestos")
      .select("*")
      .eq("equipo_id", equipoId)
      .eq("negocio_id", negocioId),
  ]);
  return {
    equipo: (equipo.data as EquipoConCliente | null) ?? null,
    historial: (historial.data ?? []) as HistorialReparacion[],
    repuestos: (repuestos.data ?? []) as RepuestoReparacion[],
  };
}

/** Clientes del negocio para el selector del alta. */
export async function getClientesDeNegocio(
  negocioId: string,
): Promise<ClienteOpcion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre, telefono")
    .eq("negocio_id", negocioId)
    .order("nombre");
  return (data ?? []) as ClienteOpcion[];
}
