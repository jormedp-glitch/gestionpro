// app/[slug]/reparaciones/page.tsx
//
// Listado de reparaciones — Server Component (R8): lee los datos con el
// cliente server y el guard de membresía, y delega el render/filtrado al
// client component ReparacionesLista. Las escrituras pasan por Server
// Actions (R9).

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
  return <ReparacionesLista slug={slug} equipos={equipos} />;
}
