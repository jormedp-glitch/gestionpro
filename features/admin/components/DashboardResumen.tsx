// features/admin/components/DashboardResumen.tsx
//
// Vista dashboard / resumen (client component). Recibe los datos y totales ya
// calculados en el Server Component shell (R8). No escribe: el alta de turnos
// abre el modal del feature turnos y el WhatsApp de cobro usa `mensajeCobro`
// (variante canónica A6) con el builder del dominio (R4).

"use client";

import { mensajeCobro } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { formatARS, formatFecha } from "@/lib/domain/formato";
import type { Turno } from "@/features/turnos/data/turnos";
import type { Cliente } from "@/features/clientes/data/clientes";

export function DashboardResumen({
  clientes,
  turnosHoy,
  activos,
  ingresoMes,
  gastosMes,
  hoy,
  color,
  negocioNombre,
  onNuevoTurno,
}: {
  clientes: Cliente[];
  turnosHoy: Turno[];
  activos: number;
  ingresoMes: number;
  gastosMes: number;
  hoy: string;
  color: string;
  negocioNombre: string;
  onNuevoTurno: () => void;
}) {
  const neto = ingresoMes - gastosMes;
  const clientesConAdeuda = clientes.filter((c) => c.estado !== "activo");

  const kpis: Array<[string, string, string, string]> = [
    [String(activos), "✅", "Activos", "#34D399"],
    [String(turnosHoy.length), "📅", "Turnos hoy", color],
    [formatARS(ingresoMes), "💰", "Ingreso mes", "#60A5FA"],
    [formatARS(neto), "📊", "Neto mes", neto >= 0 ? "#34D399" : "#F87171"],
  ];

  return (
    <div>
      <h2
        style={{
          fontFamily: "serif",
          fontSize: "1.6rem",
          marginBottom: "1.25rem",
        }}
      >
        Resumen — {formatFecha(hoy)}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        {kpis.map(([v, i, l, c]) => (
          <div
            key={l}
            style={{
              background: "#ffffff06",
              border: "1px solid #ffffff0C",
              borderRadius: "16px",
              padding: "1.25rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: ".35rem" }}>
              {i}
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: c,
                fontFamily: "serif",
              }}
            >
              {v}
            </div>
            <div
              style={{
                fontSize: ".72rem",
                color: "#555",
                marginTop: ".2rem",
              }}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#ffffff06",
          border: "1px solid #ffffff0C",
          borderRadius: "16px",
          padding: "1.4rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            fontSize: ".8rem",
            color: "#555",
            marginBottom: "1rem",
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          📅 Turnos de hoy
        </div>
        {turnosHoy.length === 0 && (
          <p
            style={{
              color: "#444",
              textAlign: "center",
              padding: "1rem",
            }}
          >
            Sin turnos para hoy
          </p>
        )}
        {turnosHoy.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: ".6rem 0",
              borderBottom: "1px solid #ffffff07",
            }}
          >
            <div>
              <span style={{ color, fontWeight: 700, marginRight: ".75rem" }}>
                {t.hora}
              </span>
              {t.cliente_nombre} · {t.servicio}
            </div>
            <span style={{ fontSize: ".78rem", color: "#34D399" }}>
              {t.estado}
            </span>
          </div>
        ))}
        <button
          onClick={onNuevoTurno}
          style={{
            marginTop: "1rem",
            background: color,
            color: "#000",
            border: "none",
            borderRadius: "8px",
            padding: ".6rem 1.2rem",
            cursor: "pointer",
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          + Nuevo turno hoy
        </button>
      </div>
      {clientesConAdeuda.length > 0 && (
        <div
          style={{
            background: "#ffffff06",
            border: "1px solid #FBBF2425",
            borderRadius: "16px",
            padding: "1.4rem",
          }}
        >
          <div
            style={{
              fontSize: ".8rem",
              color: "#FBBF24",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            ⚡ Alertas de cobro
          </div>
          {clientesConAdeuda.map((c) => {
            const telefono = c.telefono;
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: ".55rem 0",
                  borderBottom: "1px solid #ffffff07",
                }}
              >
                <span>
                  {c.nombre} · {c.plan}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".75rem",
                  }}
                >
                  <span style={{ color, fontWeight: 700 }}>
                    {formatARS(c.cuota)}
                  </span>
                  {telefono && (
                    <button
                      onClick={() =>
                        window.open(
                          buildWhatsAppLink(
                            telefono,
                            mensajeCobro(negocioNombre, c.nombre),
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
                        fontSize: ".72rem",
                        fontFamily: "sans-serif",
                      }}
                    >
                      📲 WA
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
