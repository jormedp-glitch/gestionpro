// app/[slug]/reparaciones/nuevo/page.tsx
//
// Alta de reparación — Server Component (R8): pasa al formulario los
// clientes y categorías ya leídos en el servidor. La escritura ocurre en la
// Server Action crearReparacion (R9/R10).

import {
  CATEGORIAS_EQUIPO,
  getClientesDeNegocio,
  requireNegocio,
} from "@/features/reparaciones/data/reparaciones";
import { NuevaReparacionForm } from "@/features/reparaciones/components/NuevaReparacionForm";
import { getSessionUser, isOwner } from "@/lib/auth/dal";
import { NegocioHeader } from "@/features/admin/components/NegocioHeader";

export default async function NuevaReparacionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await requireNegocio(slug);
  const clientes = await getClientesDeNegocio(negocio.id);

  // Issue #183: misma navegación que el resto de la sección Reparaciones
  // (el link "Usuarios" del header es owner-only, R6).
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
      <NuevaReparacionForm
        slug={slug}
        clientes={clientes}
        categorias={CATEGORIAS_EQUIPO}
      />
    </>
  );
}
