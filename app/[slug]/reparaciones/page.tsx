// app/[slug]/reparaciones/page.tsx
//
// Listado de reparaciones — Server Component (R8): lee los datos con el
// cliente server y el guard de membresía, y delega el render/filtrado al
// client component ReparacionesLista. Las escrituras pasan por Server
// Actions (R9). Issue #183: la ruta vive fuera del shell (switcher por
// estado), así que renderiza el header compartido arriba del contenido para
// no perder la navegación ni la vuelta.

import { getSessionUser, isOwner } from "@/lib/auth/dal";
import { NegocioHeader } from "@/features/admin/components/NegocioHeader";
import {
  getEquiposDeNegocio,
  requireNegocio,
} from "@/features/reparaciones/data/reparaciones";
import { ReparacionesLista } from "@/features/reparaciones/components/ReparacionesLista";

export default async function ReparacionesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await requireNegocio(slug);
  const equipos = await getEquiposDeNegocio(negocio.id);

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
      <ReparacionesLista slug={slug} equipos={equipos} />
    </>
  );
}
