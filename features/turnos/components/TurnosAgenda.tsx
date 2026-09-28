// features/turnos/components/TurnosAgenda.tsx
//
// Agenda de turnos navegable (client component, issue #189). Recibe TODOS los
// turnos del negocio ya leídos en el Server Component (R8) y muestra los del
// día seleccionado; la semana visible (lunes a domingo) sale de
// `diasDeLaSemana` y el estado `dia` arranca en `hoy` (inyectado, sin
// Date.now()). Las escrituras (completar) pasan por la Server Action (R9);
// demora/recordatorio solo abren WhatsApp con los builders del dominio
// (R3/R4, sin fetch del cliente). Migrado a primitivas lib/ui + tokens
// (fase5-ui P6): cero estilos inline (REQ-TT-3); EmptyState cuando el día
// visible no tiene turnos (REQ-FS-2); el color por prop se eliminó (tokens).
//
// #190 (ABM de la agenda): cada fila muestra acciones según el estado —
// confirmado: Listo/Editar/Cancelar/No vino; cancelado y no_asistio: Eliminar;
// completado: ninguna. La edición reusa NuevoTurnoModal en modo edición.

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  cancelarTurno,
  completarTurno,
  eliminarTurno,
  marcarNoAsistio,
} from "@/features/turnos/actions/turnos";
import type { TurnoActionResult } from "@/features/turnos/actions/turnos";
import { NuevoTurnoModal } from "@/features/turnos/components/NuevoTurnoModal";
import { diasDeLaSemana, sumarDias } from "@/lib/domain/agenda";
import { claseEstadoTurno } from "@/lib/domain/estados-turno";
import { mensajeDemora, mensajeRecordatorioTurno } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { formatFecha } from "@/lib/domain/formato";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import { cn } from "@/lib/ui/utils";
import type { Turno } from "@/features/turnos/data/turnos";

/** Hora + 30 min (misma lógica que la vista original, demora fija de 30'). */
function sumarTreintaMin(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + 30;
  const hr = String(Math.floor(total / 60)).padStart(2, "0");
  const mi = String(total % 60).padStart(2, "0");
  return `${hr}:${mi}`;
}

/**
 * Botón de fila (#190): envía una Server Action de turno (slug + turno_id) y
 * avisa con toast al confirmarse. `confirmar` pide validación con el
 * window.confirm del navegador antes de enviar (cancelar / eliminar).
 */
function AccionTurnoBoton({
  accion,
  slug,
  turnoId,
  etiqueta,
  descripcion,
  confirmar,
  toastOk,
  showToast,
  className,
}: {
  accion: (
    prev: TurnoActionResult,
    formData: FormData,
  ) => Promise<TurnoActionResult>;
  slug: string;
  turnoId: string;
  etiqueta: string;
  /** title + aria-label del botón; opcional para no pisar el nombre visible. */
  descripcion?: string;
  /** Texto del confirm previo; sin esto el envío es directo. */
  confirmar?: string;
  toastOk: string;
  showToast: (msg: string) => void;
  className: string;
}) {
  const [state, formAction] = useActionState(accion, {
    ok: false,
  } as TurnoActionResult);
  const manejado = useRef(false);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast(toastOk);
  }, [state, showToast, toastOk]);

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="turno_id" value={turnoId} />
      <button
        type="submit"
        title={descripcion}
        aria-label={descripcion}
        onClick={(e) => {
          // Si el usuario cancela el confirm, el form no se envía.
          if (confirmar && !window.confirm(confirmar)) e.preventDefault();
        }}
        className={className}
      >
        {etiqueta}
      </button>
    </form>
  );
}

export function TurnosAgenda({
  slug,
  rubro,
  negocioNombre,
  turnos,
  hoy,
  onNuevoTurno,
  showToast,
}: {
  slug: string;
  /** Rubro del negocio: default del aviso en el modal de edición (#190). */
  rubro: string;
  negocioNombre: string;
  turnos: Turno[];
  hoy: string;
  /** Abre el alta de turno con la fecha del día visible. */
  onNuevoTurno: (fecha: string) => void;
  showToast: (msg: string) => void;
}) {
  // Día visible de la agenda; arranca en hoy y se mueve con el strip semanal.
  const [dia, setDia] = useState(hoy);
  // Turno que se está editando (#190); null = sin modal de edición.
  const [turnoEnEdicion, setTurnoEnEdicion] = useState<Turno | null>(null);

  const semana = diasDeLaSemana(dia);
  const turnosDelDia = turnos
    .filter((t) => t.fecha === dia)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // Cantidad de turnos por fecha: badge del strip (sin badge si es 0).
  const turnosPorFecha = new Map<string, number>();
  for (const t of turnos) {
    turnosPorFecha.set(t.fecha, (turnosPorFecha.get(t.fecha) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-[1.6rem]">
          📅 Agenda — {formatFecha(dia)}
        </h2>
        <Button
          variant="accent"
          onClick={() => onNuevoTurno(dia)}
          className="rounded-[10px] font-bold"
        >
          + Nuevo turno
        </Button>
      </div>

      {/* Strip semanal (lunes a domingo): ◀ / ▶ mueven de a semanas, cada día
          salta a su fecha y el badge cuenta sus turnos. Mobile-first: scrollea
          en horizontal sin romper el layout (p-1 para que no se corte el
          badge de la esquina). */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => setDia(sumarDias(dia, -7))}
          className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground"
        >
          ◀
        </button>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto p-1">
          {semana.map((d) => {
            const cantidad = turnosPorFecha.get(d.fecha) ?? 0;
            const seleccionado = d.fecha === dia;
            const esHoy = d.fecha === hoy;
            return (
              <button
                key={d.fecha}
                type="button"
                onClick={() => setDia(d.fecha)}
                aria-label={
                  cantidad > 0
                    ? `${d.etiqueta} ${d.numeroDia}, ${cantidad} turno${cantidad === 1 ? "" : "s"}`
                    : `${d.etiqueta} ${d.numeroDia}`
                }
                aria-current={esHoy ? "date" : undefined}
                className={cn(
                  "relative flex shrink-0 cursor-pointer flex-col items-center rounded-lg px-3 py-1.5 text-xs transition-colors",
                  seleccionado
                    ? "bg-accent/15 font-medium text-accent"
                    : "text-muted-foreground",
                )}
              >
                <span>{d.etiqueta}</span>
                <span className="text-sm font-bold">{d.numeroDia}</span>
                {/* Hoy se marca con un punto aunque no sea el día elegido. */}
                {esHoy && (
                  <span
                    className="absolute bottom-0.5 size-1 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                )}
                {cantidad > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1 text-[0.6rem] font-bold text-accent-foreground">
                    {cantidad}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Semana siguiente"
          onClick={() => setDia(sumarDias(dia, 7))}
          className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground"
        >
          ▶
        </button>
        {/* Vuelta rápida a hoy, solo cuando se navegó a otro día. */}
        {dia !== hoy && (
          <Button variant="outline" size="sm" onClick={() => setDia(hoy)}>
            Hoy
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        {turnosDelDia.length === 0 && (
          <EmptyState
            title="Sin turnos este día"
            action={
              <Button variant="accent" onClick={() => onNuevoTurno(dia)}>
                + Nuevo turno
              </Button>
            }
          />
        )}
        {turnosDelDia.map((t) => {
          const telefono = t.telefono;
          // Demora/Recordar son avisos de un turno vigente: en un turno ya
          // resuelto (completado/cancelado/no vino) no aplican.
          const vigente = t.estado === "confirmado";
          const cancelado = t.estado === "cancelado";
          return (
            <div
              key={t.id}
              className="flex items-center justify-between border-b border-border/60 px-4 py-4"
            >
              <div>
                <span className="mr-3 font-bold text-accent">{t.hora}</span>
                {/* Sin teléfono el turno es un compromiso interno (#179):
                    📌; con teléfono hay a quién avisarle: 👤. */}
                <span
                  className={cn(
                    "font-medium",
                    cancelado && "text-muted-foreground line-through",
                  )}
                >
                  {telefono ? "👤" : "📌"} {t.cliente_nombre}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  · {t.servicio} ({t.duracion}min)
                </span>
                {/* Estado visible (#190): cancelado / no vino quedan en la
                    agenda y el color los distingue de un vistazo. */}
                <span
                  className={cn("ml-2 text-xs", claseEstadoTurno(t.estado))}
                >
                  {t.estado}
                </span>
              </div>
              <div className="flex gap-2">
                {vigente && telefono && (
                  <button
                    onClick={() => {
                      const horaReal = sumarTreintaMin(t.hora);
                      window.open(
                        buildWhatsAppLink(
                          telefono,
                          mensajeDemora(t.cliente_nombre, t.servicio, horaReal),
                        ),
                        "_blank",
                      );
                    }}
                    className="cursor-pointer rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-400"
                  >
                    ⏱ Demora
                  </button>
                )}
                {vigente && telefono && (
                  <button
                    onClick={() =>
                      window.open(
                        buildWhatsAppLink(
                          telefono,
                          mensajeRecordatorioTurno(
                            t.cliente_nombre,
                            t.servicio,
                            t.hora,
                            negocioNombre,
                          ),
                        ),
                        "_blank",
                      )
                    }
                    className="cursor-pointer rounded-lg border border-green-500/25 bg-green-500/10 px-2.5 py-1 text-xs text-green-500"
                  >
                    📲 Recordar
                  </button>
                )}
                {vigente && (
                  <>
                    <AccionTurnoBoton
                      accion={completarTurno}
                      slug={slug}
                      turnoId={t.id}
                      etiqueta="✓ Listo"
                      toastOk="Completado ✓"
                      showToast={showToast}
                      className="cursor-pointer rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-400"
                    />
                    <button
                      type="button"
                      title="Editar turno"
                      aria-label="Editar turno"
                      onClick={() => setTurnoEnEdicion(t)}
                      className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      ✏️ Editar
                    </button>
                    <AccionTurnoBoton
                      accion={cancelarTurno}
                      slug={slug}
                      turnoId={t.id}
                      etiqueta="🚫 Cancelar"
                      descripcion="Cancelar turno"
                      confirmar="¿Cancelar este turno?"
                      toastOk="Turno cancelado ✓"
                      showToast={showToast}
                      className="cursor-pointer rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs text-red-400"
                    />
                    <AccionTurnoBoton
                      accion={marcarNoAsistio}
                      slug={slug}
                      turnoId={t.id}
                      etiqueta="🙈 No vino"
                      descripcion="Marcar que no vino"
                      toastOk="Marcado: no vino"
                      showToast={showToast}
                      className="cursor-pointer rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-400"
                    />
                  </>
                )}
                {(cancelado || t.estado === "no_asistio") && (
                  <AccionTurnoBoton
                    accion={eliminarTurno}
                    slug={slug}
                    turnoId={t.id}
                    etiqueta="🗑️ Eliminar"
                    descripcion="Eliminar turno"
                    confirmar="¿Eliminar este turno?"
                    toastOk="Turno eliminado ✓"
                    showToast={showToast}
                    className="cursor-pointer rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs text-red-400"
                  />
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Edición (#190): el modal reusa el alta y guarda con actualizarTurno. */}
      {turnoEnEdicion && (
        <NuevoTurnoModal
          slug={slug}
          rubro={rubro}
          fechaInicial={turnoEnEdicion.fecha}
          turno={turnoEnEdicion}
          turnosExistentes={turnos}
          onClose={() => setTurnoEnEdicion(null)}
          onToast={showToast}
        />
      )}
    </div>
  );
}
