// features/portal/components/PortalAlumno.tsx
//
// Portal del alumno (client, R13–R15): render del plan activo (sesiones con
// actividades ordenadas), el progreso, los días entrenados y el estado de
// cuenta, más los toggles de completado y el avance de sesión. Los
// formularios disparan las Server Actions (el navegador nunca toca Supabase:
// el acceso anónimo pasa solo por los RPC security definer, R15). Sin shell
// ni sesión: es la pantalla pública del alumno. Los errores se muestran junto
// a cada control (no hay toast: el resultado tiene que quedar visible en la
// pantalla del alumno).
//
// `hoy` lo calcula el page (UTC, patrón del repo) y viaja como prop para que
// el HTML del server y la hidratación coincidan.

"use client";

import { useActionState } from "react";
import {
  avanzarSesionPortal,
  desmarcarCompletadoPortal,
  marcarCompletadoPortal,
  type PortalActionResult,
} from "@/features/portal/actions/portal";
import type {
  PortalActividad,
  PortalAlumno as PortalAlumnoData,
  PortalCompletado,
  PortalProgreso,
} from "@/features/portal/contrato";
import { categoriaImc, imc, type CategoriaImc } from "@/lib/domain/imc";
import { formatARS, formatFecha } from "@/lib/domain/formato";
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";

/** Máximo de nombres de actividad visibles por día (mismo criterio que R8). */
const MAX_NOMBRES = 4;

/** Etiqueta en español de la categoría OMS del IMC (R7). */
const ETIQUETA_CATEGORIA: Record<CategoriaImc, string> = {
  bajo: "Bajo",
  normal: "Normal",
  sobrepeso: "Sobrepeso",
  obesidad: "Obesidad",
};

/** Resumen de una actividad: grupo muscular, series × repeticiones y descanso. */
function detalleActividad(actividad: PortalActividad): string {
  const partes: string[] = [];
  if (actividad.grupo_muscular) partes.push(actividad.grupo_muscular);
  if (actividad.series != null) {
    partes.push(
      actividad.repeticiones
        ? `${actividad.series} × ${actividad.repeticiones}`
        : `${actividad.series} series`,
    );
  }
  if (actividad.descanso_seg != null)
    partes.push(`${actividad.descanso_seg} s`);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

/** Medidas presentes de una medición, en el orden del formulario del profe. */
function medidasDe(medicion: PortalProgreso): string {
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

/** Historial de días entrenados (R8): agrupa por fecha (viene fecha desc). */
function DiasEntrenados({
  completados,
  nombrePorActividad,
}: {
  completados: PortalCompletado[];
  nombrePorActividad: Map<string, string>;
}) {
  if (completados.length === 0) {
    return (
      <p className="m-0 text-xs text-muted-foreground">
        Sin días entrenados registrados
      </p>
    );
  }

  const porFecha = new Map<string, PortalCompletado[]>();
  for (const completado of completados) {
    const fila = porFecha.get(completado.fecha);
    if (fila) fila.push(completado);
    else porFecha.set(completado.fecha, [completado]);
  }

  return (
    <div>
      {[...porFecha.entries()].map(([fecha, fila]) => {
        const visibles = fila.slice(0, MAX_NOMBRES);
        const restantes = fila.length - visibles.length;
        return (
          <div
            key={fecha}
            className="border-b border-border/60 py-2 text-xs last:border-b-0"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{formatFecha(fecha)}</span>
              <span className="text-muted-foreground">
                {fila.length === 1
                  ? "1 actividad"
                  : `${fila.length} actividades`}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground">
              {visibles.map((completado) => (
                <span key={completado.rutina_ejercicio_id}>
                  {nombrePorActividad.get(completado.rutina_ejercicio_id) ??
                    "Actividad"}
                </span>
              ))}
              {restantes > 0 && <span>+{restantes} más</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Mensaje de error de una Server Action del portal, visible junto al control. */
function ErrorAccion({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="m-0 text-right text-xs text-destructive">
      {error}
    </p>
  );
}

/**
 * Toggle "hecha hoy" de una actividad (AD-5). El RPC es idempotente en ambos
 * sentidos; el estado `completada` sale de los completados de la fecha. React
 * 19 actualiza la acción del `useActionState` cuando cambia entre renders, así
 * que el mismo componente sirve para marcar y desmarcar.
 */
function ToggleActividad({
  slug,
  token,
  actividadId,
  fecha,
  completada,
}: {
  slug: string;
  token: string;
  actividadId: string;
  fecha: string;
  completada: boolean;
}) {
  const accion = completada
    ? desmarcarCompletadoPortal
    : marcarCompletadoPortal;
  const [state, formAction, pending] = useActionState(accion, {
    ok: false,
  } as PortalActionResult);

  return (
    <form
      action={formAction}
      className="flex shrink-0 flex-col items-end gap-1"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="rutina_ejercicio_id" value={actividadId} />
      <input type="hidden" name="fecha" value={fecha} />
      <Button
        type="submit"
        size="sm"
        variant={completada ? "secondary" : "accent"}
        disabled={pending}
        className="rounded-[10px]"
      >
        {pending ? "..." : completada ? "Deshacer" : "Hecha hoy"}
      </Button>
      <ErrorAccion error={state.error} />
    </form>
  );
}

/** Botón "Avanzar sesión" (R6): el tope del plan llega como error y se avisa. */
function AvanzarSesionBoton({ slug, token }: { slug: string; token: string }) {
  const [state, formAction, pending] = useActionState(avanzarSesionPortal, {
    ok: false,
  } as PortalActionResult);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      <Button
        type="submit"
        variant="accent"
        size="sm"
        disabled={pending}
        className="rounded-[10px] font-bold"
      >
        {pending ? "Avanzando..." : "Avanzar sesión"}
      </Button>
      <ErrorAccion error={state.error} />
    </form>
  );
}

export function PortalAlumno({
  slug,
  token,
  hoy,
  portal,
}: {
  slug: string;
  token: string;
  hoy: string;
  portal: PortalAlumnoData;
}) {
  const completadosHoy = new Set(
    portal.completados
      .filter((completado) => completado.fecha === hoy)
      .map((completado) => completado.rutina_ejercicio_id),
  );
  const nombrePorActividad = new Map<string, string>(
    (portal.asignacion?.sesiones ?? [])
      .flatMap((sesion) => sesion.actividades)
      .map((actividad) => [actividad.id, actividad.nombre]),
  );

  // R7: la última medición es la primera fila (`progreso` viene fecha desc).
  const ultimaMedicion = portal.progreso[0];
  const valorImc =
    ultimaMedicion && portal.alumno.altura_cm != null
      ? imc(ultimaMedicion.peso, portal.alumno.altura_cm)
      : null;

  // R13: estado de cuenta con el último pago y el total acumulado.
  const ultimoPago = portal.pagos[0];
  const totalPagado = portal.pagos.reduce(
    (total, pago) => total + Number(pago.monto),
    0,
  );

  const asignacion = portal.asignacion;

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-lg space-y-4 pb-10">
        {/* HEADER */}
        <div className="pt-6 pb-2 text-center">
          <div className="mb-1 text-3xl">🏋️</div>
          <h1 className="text-xl font-bold">{portal.negocio.nombre}</h1>
          <p className="text-sm text-muted-foreground">Portal del alumno</p>
          <p className="mt-2 font-medium">{portal.alumno.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {portal.alumno.objetivo ?? "—"}
            {valorImc != null
              ? ` · IMC ${valorImc} (${ETIQUETA_CATEGORIA[categoriaImc(valorImc)]})`
              : ""}
          </p>
        </div>

        {/* PLAN (R13): sesiones con actividades ordenadas */}
        <Card className="overflow-hidden p-0">
          <div className="px-4 py-3.5">
            <h2 className="m-0 font-serif text-[1.15rem]">Mi plan</h2>
            {asignacion && (
              <p className="m-0 mt-1 text-xs text-muted-foreground">
                {asignacion.rutina.nombre} · Desde{" "}
                {formatFecha(asignacion.fecha_inicio)}
              </p>
            )}
          </div>
          {asignacion ? (
            <>
              {asignacion.sesiones.map((sesion) => {
                const actual =
                  sesion.numero_sesion === asignacion.sesion_actual;
                const completada =
                  sesion.numero_sesion < asignacion.sesion_actual;
                return (
                  <div
                    key={sesion.numero_sesion}
                    className="border-t border-border/60"
                  >
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <span className="text-sm font-medium">
                        Sesión {sesion.numero_sesion}
                      </span>
                      {actual && <Badge variant="accent">Actual</Badge>}
                      {completada && <Badge variant="secondary">Hecha</Badge>}
                    </div>
                    {sesion.actividades.length === 0 ? (
                      <p className="m-0 px-4 pb-3 text-xs text-muted-foreground">
                        Sin actividades cargadas.
                      </p>
                    ) : (
                      <ul className="m-0 list-none space-y-2 px-4 pb-3">
                        {sesion.actividades.map((actividad) => (
                          <li
                            key={actividad.id}
                            className="rounded-xl border border-border/60 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="m-0 text-sm font-medium">
                                  {actividad.nombre}
                                </p>
                                <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                                  {detalleActividad(actividad)}
                                </p>
                                {actividad.notas && (
                                  <p className="m-0 mt-1 text-xs text-muted-foreground">
                                    {actividad.notas}
                                  </p>
                                )}
                                {actividad.url_video && (
                                  <a
                                    href={actividad.url_video}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-xs text-accent underline"
                                  >
                                    ▶ Ver video
                                  </a>
                                )}
                              </div>
                              <ToggleActividad
                                slug={slug}
                                token={token}
                                actividadId={actividad.id}
                                fecha={hoy}
                                completada={completadosHoy.has(actividad.id)}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3.5">
                <p className="m-0 text-xs text-muted-foreground">
                  Sesión {asignacion.sesion_actual} de{" "}
                  {asignacion.sesiones_total}
                </p>
                <AvanzarSesionBoton slug={slug} token={token} />
              </div>
            </>
          ) : (
            <p className="m-0 px-4 pb-4 text-sm text-muted-foreground">
              Todavía no tenés una rutina asignada.
            </p>
          )}
        </Card>

        {/* PROGRESO (R13) */}
        <Card className="overflow-hidden p-0">
          <h2 className="m-0 px-4 py-3.5 font-serif text-[1.15rem]">
            📈 Progreso
          </h2>
          {portal.progreso.length === 0 ? (
            <p className="m-0 px-4 pb-4 text-sm text-muted-foreground">
              Sin mediciones registradas
            </p>
          ) : (
            /* En pantallas angostas la fila scrollea en horizontal. */
            <div className="overflow-x-auto">
              {portal.progreso.map((medicion) => {
                const imcFila =
                  portal.alumno.altura_cm != null
                    ? imc(medicion.peso, portal.alumno.altura_cm)
                    : null;
                return (
                  <div
                    key={medicion.id}
                    className="grid min-w-[420px] grid-cols-[auto_auto_1fr] items-center gap-2 border-t border-border/60 px-4 py-3"
                  >
                    <div className="whitespace-nowrap text-sm font-medium">
                      {formatFecha(medicion.fecha)}
                    </div>
                    <div className="whitespace-nowrap text-sm">
                      {medicion.peso} kg
                    </div>
                    <div className="min-w-0 truncate text-xs text-muted-foreground">
                      {medidasDe(medicion)}
                      {imcFila != null ? ` · IMC ${imcFila}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* DÍAS ENTRENADOS (R8) */}
        <Card className="p-4">
          <h2 className="m-0 font-serif text-[1.15rem]">📅 Días entrenados</h2>
          <div className="mt-2">
            <DiasEntrenados
              completados={portal.completados}
              nombrePorActividad={nombrePorActividad}
            />
          </div>
        </Card>

        {/* ESTADO DE CUENTA (R13) */}
        <Card className="p-4">
          <h2 className="m-0 font-serif text-[1.15rem]">💳 Estado de cuenta</h2>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Último pago</span>
              <span>
                {ultimoPago
                  ? `${formatARS(ultimoPago.monto)} · ${formatFecha(ultimoPago.fecha)}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Total pagado</span>
              <span className="font-medium">{formatARS(totalPagado)}</span>
            </div>
          </div>
        </Card>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          Tu profe administra tu plan; esta página muestra tu progreso.
        </p>
      </div>
    </div>
  );
}
