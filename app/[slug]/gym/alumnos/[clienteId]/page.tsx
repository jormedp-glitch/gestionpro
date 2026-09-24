// app/[slug]/gym/alumnos/[clienteId]/page.tsx
//
// Ficha del alumno — Server Component (R6, R7, R8): lee la ficha, la
// asignación activa, el progreso, los completados y las rutinas del negocio
// con el cliente server y el guard de membresía, y delega el render
// interactivo a `DetalleAlumno`. Ruta real (no modal) para que la ficha sea
// enlazable desde la lista de alumnos.

import { notFound } from "next/navigation";
import { requireNegocio } from "@/lib/server/negocio";
import {
  getAlumnosDeNegocio,
  getAsignacionActiva,
  getCompletadosDeCliente,
  getProgresoDeCliente,
  getRutinaConSesiones,
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

  // La asignación se resuelve una sola vez: su promesa alimenta el Promise.all
  // y además encadena la lectura de la rutina activa (R8: nombres de los
  // completados). Sin asignación no hay sesiones que leer.
  const asignacionPromise = getAsignacionActiva(clienteId, negocio.id);

  const [asignacion, progreso, rutinas, completados, sesiones] =
    await Promise.all([
      asignacionPromise,
      getProgresoDeCliente(clienteId, negocio.id),
      getRutinasDeNegocio(negocio.id),
      getCompletadosDeCliente(clienteId, negocio.id),
      asignacionPromise.then((activa) =>
        activa
          ? getRutinaConSesiones(activa.rutina_id, negocio.id)
          : Promise.resolve([]),
      ),
    ]);

  // R8: actividades de la rutina activa, aplanadas de sus sesiones.
  const actividades = sesiones.flatMap((sesion) => sesion.actividades);

  return (
    <DetalleAlumno
      slug={slug}
      alumno={alumno}
      asignacion={asignacion}
      progreso={progreso}
      rutinas={rutinas}
      completados={completados}
      actividades={actividades}
    />
  );
}
