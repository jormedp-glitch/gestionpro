// app/[slug]/gym/alumnos/[clienteId]/page.tsx
//
// Ficha del alumno — Server Component (R6, R7): lee la ficha, la asignación
// activa, el progreso y las rutinas del negocio con el cliente server y el
// guard de membresía, y delega el render interactivo a `DetalleAlumno`. Ruta
// real (no modal) para que la ficha sea enlazable desde la lista de alumnos.

import { notFound } from "next/navigation";
import { requireNegocio } from "@/lib/server/negocio";
import {
  getAlumnosDeNegocio,
  getAsignacionActiva,
  getProgresoDeCliente,
  getRutinasDeNegocio,
} from "@/features/gym/data/gym";
import { DetalleAlumno } from "@/features/gym/components/DetalleAlumno";

export default async function AlumnoFichaPage({
  params,
}: {
  params: Promise<{ slug: string; clienteId: string }>;
}) {
  const { slug, clienteId } = await params;
  const negocio = await requireNegocio(slug);

  // La ficha se busca dentro de los alumnos del negocio: un cliente de otro
  // negocio (o inexistente) no es visible ni adivinable desde acá.
  const alumnos = await getAlumnosDeNegocio(negocio.id);
  const alumno = alumnos.find((a) => a.cliente_id === clienteId);
  if (!alumno) notFound();

  const [asignacion, progreso, rutinas] = await Promise.all([
    getAsignacionActiva(clienteId, negocio.id),
    getProgresoDeCliente(clienteId, negocio.id),
    getRutinasDeNegocio(negocio.id),
  ]);

  return (
    <DetalleAlumno
      slug={slug}
      alumno={alumno}
      asignacion={asignacion}
      progreso={progreso}
      rutinas={rutinas}
    />
  );
}
