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
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { cn } from "@/lib/ui/utils";
import type { Turno } from "@/features/turnos/data/turnos";
import type { Cliente } from "@/features/clientes/data/clientes";

export function DashboardResumen({
  clientes,
  turnosHoy,
  activos,
  ingresoMes,
  gastosMes,
  hoy,
  negocioNombre,
  onNuevoTurno,
}: {
  clientes: Cliente[];
  turnosHoy: Turno[];
  activos: number;
  ingresoMes: number;
  gastosMes: number;
  hoy: string;
  negocioNombre: string;
  onNuevoTurno: () => void;
}) {
  const neto = ingresoMes - gastosMes;
  const clientesConAdeuda = clientes.filter((c) => c.estado !== "activo");

  const kpis: Array<[string, string, string, string]> = [
    [String(activos), "✅", "Activos", "text-emerald-400"],
    [String(turnosHoy.length), "📅", "Turnos hoy", "text-accent"],
    [formatARS(ingresoMes), "💰", "Ingreso mes", "text-blue-400"],
    [
      formatARS(neto),
      "📊",
      "Neto mes",
      neto >= 0 ? "text-emerald-400" : "text-red-400",
    ],
  ];

  return (
    <div>
      <h2 className="mb-5 font-serif text-[1.6rem]">
        Resumen — {formatFecha(hoy)}
      </h2>
      <div className="mb-5 grid grid-cols-4 gap-4">
        {kpis.map(([v, i, l, c]) => (
          <Card key={l} className="p-5 text-center">
            <div className="mb-1 text-2xl">{i}</div>
            <div className={cn("font-serif text-[1.4rem] font-bold", c)}>
              {v}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{l}</div>
          </Card>
        ))}
      </div>
      <Card className="mb-5 p-6">
        <div className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
          📅 Turnos de hoy
        </div>
        {turnosHoy.length === 0 && (
          <p className="py-4 text-center text-muted-foreground">
            Sin turnos para hoy
          </p>
        )}
        {turnosHoy.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between border-b border-border/60 py-2.5"
          >
            <div>
              <span className="mr-3 font-bold text-accent">{t.hora}</span>
              {t.cliente_nombre} · {t.servicio}
            </div>
            <span className="text-xs text-emerald-400">{t.estado}</span>
          </div>
        ))}
        <Button
          variant="accent"
          onClick={onNuevoTurno}
          className="mt-4 font-bold"
        >
          + Nuevo turno hoy
        </Button>
      </Card>
      {clientesConAdeuda.length > 0 && (
        <Card className="border-amber-400/25 p-6">
          <div className="mb-4 text-xs uppercase tracking-wider text-amber-400">
            ⚡ Alertas de cobro
          </div>
          {clientesConAdeuda.map((c) => {
            const telefono = c.telefono;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between border-b border-border/60 py-2.5"
              >
                <span>
                  {c.nombre} · {c.plan}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-accent">
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
                      className="cursor-pointer rounded-lg border border-green-500/25 bg-green-500/10 px-2.5 py-1 text-xs text-green-500"
                    >
                      📲 WA
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
