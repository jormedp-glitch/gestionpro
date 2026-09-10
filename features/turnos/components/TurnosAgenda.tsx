// features/turnos/components/TurnosAgenda.tsx
//
// Agenda de turnos del día (client component). Recibe los turnos ya leídos en
// el Server Component (R8) y filtra por fecha de hoy, igual que la vista
// original del monolito. Las escrituras (completar) pasan por la Server
// Action (R9); demora/recordatorio solo abren WhatsApp con los builders del
// dominio (R3/R4, sin fetch del cliente). Migrado a primitivas lib/ui +
// tokens (fase5-ui P6): cero estilos inline (REQ-TT-3); EmptyState cuando no
// hay turnos para hoy (REQ-FS-2); el color por prop se eliminó (tokens).

"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { completarTurno } from "@/features/turnos/actions/turnos";
import type { TurnoActionResult } from "@/features/turnos/actions/turnos";
import { mensajeDemora, mensajeRecordatorioTurno } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { formatFecha } from "@/lib/domain/formato";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import type { Turno } from "@/features/turnos/data/turnos";

/** Hora + 30 min (misma lógica que la vista original, demora fija de 30'). */
function sumarTreintaMin(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + 30;
  const hr = String(Math.floor(total / 60)).padStart(2, "0");
  const mi = String(total % 60).padStart(2, "0");
  return `${hr}:${mi}`;
}

/** Botón "✓ Listo": completa el turno vía Server Action y avisa con toast. */
function CompletarTurnoBoton({
  slug,
  turnoId,
  showToast,
}: {
  slug: string;
  turnoId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(completarTurno, {
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
    showToast("Completado ✓");
  }, [state, showToast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="turno_id" value={turnoId} />
      <button
        type="submit"
        className="cursor-pointer rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-400"
      >
        ✓ Listo
      </button>
    </form>
  );
}

export function TurnosAgenda({
  slug,
  negocioNombre,
  turnos,
  hoy,
  onNuevoTurno,
  showToast,
}: {
  slug: string;
  negocioNombre: string;
  turnos: Turno[];
  hoy: string;
  onNuevoTurno: () => void;
  showToast: (msg: string) => void;
}) {
  const turnosHoy = turnos
    .filter((t) => t.fecha === hoy)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-[1.6rem]">
          📅 Agenda — {formatFecha(hoy)}
        </h2>
        <Button
          variant="accent"
          onClick={onNuevoTurno}
          className="rounded-[10px] font-bold"
        >
          + Nuevo turno
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        {turnosHoy.length === 0 && (
          <EmptyState
            title="Sin turnos para hoy"
            action={
              <Button variant="accent" onClick={onNuevoTurno}>
                + Nuevo turno
              </Button>
            }
          />
        )}
        {turnosHoy.map((t) => {
          const telefono = t.telefono;
          return (
            <div
              key={t.id}
              className="flex items-center justify-between border-b border-border/60 px-4 py-4"
            >
              <div>
                <span className="mr-3 font-bold text-accent">{t.hora}</span>
                <span className="font-medium">{t.cliente_nombre}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  · {t.servicio} ({t.duracion}min)
                </span>
              </div>
              <div className="flex gap-2">
                {telefono && (
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
                {telefono && (
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
                <CompletarTurnoBoton
                  slug={slug}
                  turnoId={t.id}
                  showToast={showToast}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
