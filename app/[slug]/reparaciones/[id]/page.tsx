// app/[slug]/reparaciones/[id]/page.tsx
//
// Detalle de una reparación — Server Component (R8): lee equipo + historial +
// repuestos con el cliente server y el guard de membresía. Las transiciones
// se restringen por el mapa del dominio en UI (siguientesEstados) y en el
// servidor (puedeTransicionar) — spec R2.

import { redirect, notFound } from "next/navigation";
import {
  getEquipoDetalle,
  requireNegocio,
} from "@/features/reparaciones/data/reparaciones";
import { DetalleReparacion } from "@/features/reparaciones/components/DetalleReparacion";

export default async function DetalleReparacionPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  // Evitar que "nuevo" sea tratado como un ID (misma protección que antes).
  if (id === "nuevo") redirect(`/${slug}/reparaciones/nuevo`);

  const negocio = await requireNegocio(slug);
  const { equipo, historial, repuestos } = await getEquipoDetalle(
    negocio.id,
    id,
  );
  if (!equipo) notFound();

  return (
    <DetalleReparacion
      slug={slug}
      equipo={equipo}
      historial={historial}
      repuestos={repuestos}
    />
  );
}
