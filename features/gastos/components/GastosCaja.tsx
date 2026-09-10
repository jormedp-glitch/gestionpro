// features/gastos/components/GastosCaja.tsx
//
// Caja / gastos (client component). Recibe los gastos ya leídos en el Server
// Component (R8) y los totales del mes calculados en el shell. Las escrituras
// (agregar/eliminar) pasan por Server Actions (R9). Los campos del form son
// uncontrolled: React 19 los resetea solos tras una acción exitosa. Migrado a
// primitivas lib/ui + tokens (fase5-ui P6): cero estilos inline (REQ-TT-3);
// EmptyState cuando no hay gastos (REQ-FS-2); el color por prop se eliminó
// (tokens; KPIs con mapeo discovery #200 exacto a Tailwind 4).

"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { agregarGasto, eliminarGasto } from "@/features/gastos/actions/gastos";
import type { GastoActionResult } from "@/features/gastos/actions/gastos";
import { formatARS, formatFecha } from "@/lib/domain/formato";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import { Input } from "@/lib/ui/input";
import { cn } from "@/lib/ui/utils";
import type { Gasto } from "@/features/gastos/data/gastos";

/** Botón "✕": elimina el gasto vía Server Action y avisa con toast. */
function EliminarGastoBoton({
  slug,
  gastoId,
  showToast,
}: {
  slug: string;
  gastoId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(eliminarGasto, {
    ok: false,
  } as GastoActionResult);
  const manejado = useRef(false);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast("Eliminado");
  }, [state, showToast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="gasto_id" value={gastoId} />
      <button
        type="submit"
        className="cursor-pointer rounded-lg border-none bg-red-400/10 px-2 py-1 text-xs text-red-400"
      >
        ✕
      </button>
    </form>
  );
}

export function GastosCaja({
  slug,
  gastos,
  ingresoMes,
  gastosMes,
  hoy,
  showToast,
}: {
  slug: string;
  gastos: Gasto[];
  ingresoMes: number;
  gastosMes: number;
  hoy: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(agregarGasto, {
    ok: false,
  } as GastoActionResult);
  const manejado = useRef(false);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast("Gasto registrado ✓");
  }, [state, showToast]);

  const neto = ingresoMes - gastosMes;
  const kpis: Array<[string, string, string]> = [
    [formatARS(ingresoMes), "Ingresos", "text-emerald-400"],
    [formatARS(gastosMes), "Gastos", "text-red-400"],
    [formatARS(neto), "Neto", neto >= 0 ? "text-emerald-400" : "text-red-400"],
  ];

  return (
    <div>
      <h2 className="mb-5 font-serif text-[1.6rem]">💸 Caja</h2>
      <div className="mb-5 grid grid-cols-3 gap-4">
        {kpis.map(([valor, etiqueta, c], i) => (
          <Card key={i} className="p-5 text-center">
            <div className={cn("font-serif text-[1.3rem] font-bold", c)}>
              {valor}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{etiqueta}</div>
          </Card>
        ))}
      </div>
      <Card className="mb-5 p-6">
        <form
          action={formAction}
          className="grid grid-cols-[1fr_140px_120px_auto] items-end gap-3"
        >
          <input type="hidden" name="slug" value={slug} />
          <Input placeholder="Descripción" name="descripcion" />
          <Input type="number" placeholder="Monto $" name="monto" />
          <Input type="date" name="fecha" defaultValue={hoy} />
          <Button
            type="submit"
            variant="accent"
            className="h-10 whitespace-nowrap rounded-[10px] font-bold"
          >
            + Agregar
          </Button>
        </form>
        {!state.ok && state.error && (
          <p className="mt-3 text-sm text-red-400">{state.error}</p>
        )}
      </Card>
      <Card className="overflow-hidden p-0">
        {gastos.length === 0 && <EmptyState title="Sin gastos" />}
        {gastos.map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between border-b border-border/60 px-4 py-3"
          >
            <div>
              <div className="text-sm">{g.descripcion}</div>
              <div className="text-xs text-muted-foreground">
                {formatFecha(g.fecha || "")}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-red-400">
                - {formatARS(g.monto)}
              </span>
              <EliminarGastoBoton
                slug={slug}
                gastoId={g.id}
                showToast={showToast}
              />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
