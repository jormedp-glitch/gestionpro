// app/[slug]/reparaciones/[id]/page.tsx
//
// Detalle de una reparación — Server Component (R8): lee equipo + historial +
// repuestos con el cliente server y el guard de membresía. Las transiciones
// se restringen por el mapa del dominio en UI (siguientesEstados) y en el
// servidor (puedeTransicionar) — spec R2. Issue #183: header compartido
// arriba del contenido (la ruta vive fuera del shell).

import { redirect, notFound } from "next/navigation";
import { getSessionUser, isOwner } from "@/lib/auth/dal";
import { NegocioHeader } from "@/features/admin/components/NegocioHeader";
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

  // El link "Usuarios" del header solo se muestra al owner (R6): mismo
  // cálculo que el page del shell.
  const user = await getSessionUser();
  const esOwner = user ? await isOwner(user.id, negocio.id) : false;

  return (
    <>
      <NegocioHeader
        slug={slug}
        negocio={negocio}
        esOwner={esOwner}
        activa="reparaciones"
      />
      <DetalleReparacion
        slug={slug}
        rubro={negocio.rubro}
        equipo={equipo}
        historial={historial}
        repuestos={repuestos}
      />
    </>
  );
}
