// features/gym/components/DetalleAlumno.tsx
//
// Ficha del alumno (R6, R7; client component). Recibe la ficha, la asignación
// activa, el progreso y las rutinas ya leídos en el Server Component. R6:
// asignar/desasignar rutina y avanzar la sesión. R7: IMC de la última medición
// y listado de mediciones con su IMC por fila. Cada acción se deshabilita
// mientras está pendiente y sus errores se avisan por toast. R8 queda afuera.

"use client";

import { useActionState, useState } from "react";
import {
  asignarRutina,
  avanzarSesion,
  desasignarRutina,
  type GymActionResult,
} from "@/features/gym/actions/asignaciones";
import { CompletadosAlumno } from "@/features/gym/components/CompletadosAlumno";
import { RegistrarMedicionModal } from "@/features/gym/components/RegistrarMedicionModal";
import { useAvisoAccion } from "@/features/gym/components/useAvisoAccion";
import { categoriaImc, imc, type CategoriaImc } from "@/lib/domain/imc";
import { formatFecha } from "@/lib/domain/formato";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/ui/select";
import { toast, Toaster } from "@/lib/ui/toast";
import type {
  GymActividad,
  GymAlumno,
  GymAsignacion,
  GymCompletado,
  GymProgreso,
  GymRutina,
} from "@/features/gym/data/gym";

/** Etiqueta en español de la categoría OMS del IMC (R7). */
const ETIQUETA_CATEGORIA: Record<CategoriaImc, string> = {
  bajo: "Bajo",
  normal: "Normal",
  sobrepeso: "Sobrepeso",
  obesidad: "Obesidad",
};

/** Medidas presentes de una medición, en el orden del formulario (R7). */
function medidasDe(medicion: GymProgreso): string {
  const partes: string[] = [];
  if (medicion.cintura != null) partes.push(`Cintura ${medicion.cintura} cm`);
  if (medicion.cadera != null) partes.push(`Cadera ${medicion.cadera} cm`);
  if (medicion.porcentaje_grasa != null)
    partes.push(`Grasa ${medicion.porcentaje_grasa}%`);
  if (medicion.pecho_cm != null) partes.push(`Pecho ${medicion.pecho_cm} cm`);
  if (medicion.bicep_cm != null) partes.push(`Bíceps ${medicion.bicep_cm} cm`);
  if (medicion.metrica1_nombre && medicion.metrica1_valor != null)
    partes.push(`${medicion.metrica1_nombre} ${medicion.metrica1_valor}`);
  if (medicion.metrica2_nombre && medicion.metrica2_valor != null)
    partes.push(`${medicion.metrica2_nombre} ${medicion.metrica2_valor}`);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

/** Botón "Avanzar sesión" (R6): sube la sesión actual de la asignación. */
function AvanzarSesionBoton({
  slug,
  asignacionId,
  showToast,
}: {
  slug: string;
  asignacionId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(avanzarSesion, {
    ok: false,
  } as GymActionResult);
  // El tope de sesiones ("El alumno ya completó todas las sesiones.") llega
  // como error y no puede quedar invisible.
  useAvisoAccion(state, showToast, "Sesión avanzada ✓");

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="asignacion_id" value={asignacionId} />
      <Button
        type="submit"
        variant="accent"
        size="sm"
        disabled={pending}
        className="rounded-[10px] font-bold"
      >
        {pending ? "Avanzando..." : "Avanzar sesión"}
      </Button>
    </form>
  );
}

/** Botón "Desasignar" (R6): desactiva la asignación vigente del alumno. */
function DesasignarRutinaBoton({
  slug,
  asignacionId,
  showToast,
}: {
  slug: string;
  asignacionId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(desasignarRutina, {
    ok: false,
  } as GymActionResult);
  useAvisoAccion(state, showToast, "Rutina desasignada ✓");

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("¿Desasignar la rutina del alumno?"))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="asignacion_id" value={asignacionId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        className="rounded-[10px] text-muted-foreground"
      >
        Desasignar
      </Button>
    </form>
  );
}

/** Formulario de asignación (R6): Select de rutinas + submit. */
function AsignarRutinaForm({
  slug,
  clienteId,
  rutinas,
  showToast,
}: {
  slug: string;
  clienteId: string;
  rutinas: GymRutina[];
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(asignarRutina, {
    ok: false,
  } as GymActionResult);
  const [rutinaId, setRutinaId] = useState(rutinas[0]?.id ?? "");
  useAvisoAccion(state, showToast, "Rutina asignada ✓");

  if (rutinas.length === 0) {
    return (
      <p className="m-0 text-sm text-muted-foreground">
        No hay rutinas creadas.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      {/* Radix Select no participa del <form>: el valor viaja en el hidden. */}
      <input type="hidden" name="rutina_id" value={rutinaId} />
      <Select value={rutinaId} onValueChange={setRutinaId}>
        <SelectTrigger>
          <SelectValue placeholder="Elegí una rutina" />
        </SelectTrigger>
        <SelectContent>
          {rutinas.map((rutina) => (
            <SelectItem key={rutina.id} value={rutina.id}>
              {rutina.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="accent"
          size="sm"
          disabled={pending}
          className="rounded-[10px] font-bold"
        >
          {pending ? "Asignando..." : "Asignar rutina"}
        </Button>
      </div>
    </form>
  );
}

export function DetalleAlumno({
  slug,
  alumno,
  asignacion,
  progreso,
  rutinas,
  completados,
  actividades,
}: {
  slug: string;
  alumno: GymAlumno;
  asignacion: GymAsignacion | null;
  progreso: GymProgreso[];
  rutinas: GymRutina[];
  completados: GymCompletado[];
  actividades: GymActividad[];
}) {
  const showToast = (msg: string) => toast(msg, { duration: 3000 });
  const [modalMedicion, setModalMedicion] = useState(false);

  // R7: la última medición es la primera fila (`progreso` viene por fecha desc).
  const ultima = progreso[0];
  const valorImc =
    ultima && alumno.altura_cm != null
      ? imc(ultima.peso, alumno.altura_cm)
      : null;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-16">
      <a href={"/" + slug} className="text-sm text-muted-foreground">
        ← Volver
      </a>
      <h2 className="mb-1 mt-2 font-serif text-[1.6rem]">
        🏋️ {alumno.cliente?.nombre ?? "Alumno"}
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        {alumno.objetivo ?? "—"} ·{" "}
        {alumno.altura_cm != null ? `${alumno.altura_cm} cm` : "—"} ·{" "}
        {valorImc != null
          ? `IMC ${valorImc} (${ETIQUETA_CATEGORIA[categoriaImc(valorImc)]})`
          : "IMC pendiente"}
      </p>
      <Card className="mt-5 p-5">
        <h3 className="m-0 font-serif text-[1.15rem]">Rutina asignada</h3>
        {asignacion ? (
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-medium">
                {asignacion.rutina?.nombre ?? "Rutina"}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                Sesión {asignacion.sesion_actual} de{" "}
                {asignacion.rutina?.sesiones_total ?? "?"} · Desde{" "}
                {formatFecha(asignacion.fecha_inicio)}
              </p>
            </div>
            <div className="flex gap-1.5">
              <AvanzarSesionBoton
                slug={slug}
                asignacionId={asignacion.id}
                showToast={showToast}
              />
              <DesasignarRutinaBoton
                slug={slug}
                asignacionId={asignacion.id}
                showToast={showToast}
              />
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <AsignarRutinaForm
              slug={slug}
              clienteId={alumno.cliente_id}
              rutinas={rutinas}
              showToast={showToast}
            />
          </div>
        )}
      </Card>

      <Card className="mt-5 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <h3 className="m-0 font-serif text-[1.15rem]">Progreso</h3>
          <Button
            variant="accent"
            size="sm"
            onClick={() => setModalMedicion(true)}
            className="rounded-[10px] font-bold"
          >
            + Registrar medición
          </Button>
        </div>
        {progreso.length === 0 ? (
          <p className="m-0 px-4 pb-4 text-sm text-muted-foreground">
            Sin mediciones registradas
          </p>
        ) : (
          /* En pantallas angostas la fila scrollea en horizontal en vez de
             desbordar la tarjeta. */
          <div className="overflow-x-auto">
            {progreso.map((medicion) => {
              const imcFila =
                alumno.altura_cm != null
                  ? imc(medicion.peso, alumno.altura_cm)
                  : null;
              return (
                <div
                  key={medicion.id}
                  className="grid min-w-[520px] grid-cols-[auto_auto_1fr_auto] items-center gap-2 border-b border-border/60 px-4 py-3.5"
                >
                  <div className="whitespace-nowrap text-sm font-medium">
                    {formatFecha(medicion.fecha)}
                  </div>
                  <div className="whitespace-nowrap text-sm">
                    {medicion.peso} kg
                  </div>
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {medidasDe(medicion)}
                  </div>
                  <div className="whitespace-nowrap text-xs text-muted-foreground">
                    {imcFila != null ? `IMC ${imcFila}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mt-5 overflow-hidden p-0">
        <h3 className="m-0 px-4 py-3.5 font-serif text-[1.15rem]">
          📅 Días entrenados
        </h3>
        <div className="px-4 pb-3">
          <CompletadosAlumno
            completados={completados}
            actividades={actividades}
          />
        </div>
      </Card>

      {modalMedicion && (
        <RegistrarMedicionModal
          slug={slug}
          clienteId={alumno.cliente_id}
          onClose={() => setModalMedicion(false)}
          onToast={showToast}
        />
      )}

      <Toaster />
    </div>
  );
}
