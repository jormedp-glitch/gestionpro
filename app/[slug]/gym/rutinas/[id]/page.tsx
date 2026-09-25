// app/[slug]/gym/rutinas/[id]/page.tsx
//
// Detalle de la rutina — Server Component (R5): busca la rutina dentro de las
// rutinas del negocio con el guard de membresía, lee sus sesiones con las
// actividades ordenadas y el catálogo de ejercicios, y delega el render
// interactivo a `DetalleRutina`. Ruta real (no modal) para que la rutina sea
// enlazable desde la lista.

import { notFound } from "next/navigation";
import { requireNegocio } from "@/lib/server/negocio";
import {
  getEjerciciosDeNegocio,
  getRutinaConSesiones,
  getRutinasDeNegocio,
} from "@/features/gym/data/gym";
import { DetalleRutina } from "@/features/gym/components/DetalleRutina";

export default async function RutinaDetallePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const negocio = await requireNegocio(slug);

  // La rutina se busca dentro de las rutinas del negocio: una rutina de otro
  // negocio (o inexistente) no es visible ni adivinable desde acá.
  const rutinas = await getRutinasDeNegocio(negocio.id);
  const rutina = rutinas.find((r) => r.id === id);
  if (!rutina) notFound();

  const [sesiones, ejercicios] = await Promise.all([
    getRutinaConSesiones(id, negocio.id),
    getEjerciciosDeNegocio(negocio.id),
  ]);

  return (
    <DetalleRutina
      slug={slug}
      rutina={rutina}
      sesiones={sesiones}
      ejercicios={ejercicios}
    />
  );
}
