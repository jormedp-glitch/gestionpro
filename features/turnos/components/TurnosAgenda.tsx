// features/turnos/components/TurnosAgenda.tsx
//
// Agenda de turnos del día (client component). Recibe los turnos ya leídos en
// el Server Component (R8) y filtra por fecha de hoy, igual que la vista
// original del monolito. Las escrituras (completar) pasan por la Server
// Action (R9); demora/recordatorio solo abren WhatsApp con los builders del
// dominio (R3/R4, sin fetch del cliente).

"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { completarTurno } from "@/features/turnos/actions/turnos";
import type { TurnoActionResult } from "@/features/turnos/actions/turnos";
import { mensajeDemora, mensajeRecordatorioTurno } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { formatFecha } from "@/lib/domain/formato";
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
        style={{
          background: "#34D39915",
          border: "1px solid #34D39930",
          color: "#34D399",
          borderRadius: "8px",
          padding: ".3rem .6rem",
          cursor: "pointer",
          fontSize: ".75rem",
          fontFamily: "sans-serif",
        }}
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
  color,
  onNuevoTurno,
  showToast,
}: {
  slug: string;
  negocioNombre: string;
  turnos: Turno[];
  hoy: string;
  color: string;
  onNuevoTurno: () => void;
  showToast: (msg: string) => void;
}) {
  const turnosHoy = turnos
    .filter((t) => t.fecha === hoy)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <h2 style={{ fontFamily: "serif", fontSize: "1.6rem" }}>
          📅 Agenda — {formatFecha(hoy)}
        </h2>
        <button
          onClick={onNuevoTurno}
          style={{
            background: color,
            color: "#000",
            border: "none",
            borderRadius: "10px",
            padding: ".6rem 1.2rem",
            cursor: "pointer",
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          + Nuevo turno
        </button>
      </div>
      <div
        style={{
          background: "#ffffff06",
          border: "1px solid #ffffff0C",
          borderRadius: "16px",
          padding: "0",
          overflow: "hidden",
        }}
      >
        {turnosHoy.length === 0 && (
          <p
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#444",
            }}
          >
            Sin turnos para hoy
          </p>
        )}
        {turnosHoy.map((t) => {
          const telefono = t.telefono;
          return (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem",
                borderBottom: "1px solid #ffffff07",
              }}
            >
              <div>
                <span
                  style={{
                    color,
                    fontWeight: 700,
                    marginRight: ".75rem",
                  }}
                >
                  {t.hora}
                </span>
                <span style={{ fontWeight: 500 }}>{t.cliente_nombre}</span>
                <span
                  style={{
                    color: "#666",
                    marginLeft: ".5rem",
                    fontSize: ".85rem",
                  }}
                >
                  · {t.servicio} ({t.duracion}min)
                </span>
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
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
                    style={{
                      background: "#FBBF2415",
                      border: "1px solid #FBBF2430",
                      color: "#FBBF24",
                      borderRadius: "8px",
                      padding: ".3rem .6rem",
                      cursor: "pointer",
                      fontSize: ".75rem",
                      fontFamily: "sans-serif",
                    }}
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
                    style={{
                      background: "#25D36615",
                      border: "1px solid #25D36630",
                      color: "#25D366",
                      borderRadius: "8px",
                      padding: ".3rem .6rem",
                      cursor: "pointer",
                      fontSize: ".75rem",
                      fontFamily: "sans-serif",
                    }}
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
      </div>
    </div>
  );
}
