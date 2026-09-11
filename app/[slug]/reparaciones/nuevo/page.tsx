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

export default async function NuevaReparacionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await requireNegocio(slug);
  const clientes = await getClientesDeNegocio(negocio.id);
  return (
    <NuevaReparacionForm
      slug={slug}
      clientes={clientes}
      categorias={CATEGORIAS_EQUIPO}
    />
  );
}
