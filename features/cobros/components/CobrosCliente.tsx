// features/cobros/components/CobrosCliente.tsx
//
// Historial de cobros de un cliente + total del mes (R10, R12; client
// component presentacional). Se renderiza embebido en la fila expandida de
// ClientesLista: no lee datos, recibe los cobros ya filtrados por el llamador
// y avisa con `onCobrar` cuando se quiere registrar uno nuevo. Compacto por
// diseño (texto chico, separadores por token) para no romper la densidad del
// listado.

"use client";

import { formatARS, formatFecha } from "@/lib/domain/formato";
import type { Cobro } from "@/features/cobros/data/cobros";

/** Etiqueta capitalizada del medio de pago (R10). */
function etiquetaMedioPago(medio: string): string {
  return medio.charAt(0).toUpperCase() + medio.slice(1);
}

export function CobrosCliente({
  cobros,
  hoy,
  onCobrar,
}: {
  cobros: Cobro[];
  hoy: string;
  onCobrar?: () => void;
}) {
  // R12: el total del mes se calcula sobre los cobros ya leídos, filtrando
  // por prefijo yyyy-mm (mismo criterio que el resumen de gastos del shell).
  const mesActual = hoy.slice(0, 7);
  const totalMes = cobros
    .filter((c) => c.fecha.startsWith(mesActual))
    .reduce((s, c) => s + Number(c.monto || 0), 0);

  return (
    <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium">💵 Cobros</span>
          <span className="text-xs text-muted-foreground">
            Total del mes:{" "}
            <span className="font-bold text-accent">{formatARS(totalMes)}</span>
          </span>
        </div>
        {onCobrar && (
          <button
            type="button"
            onClick={onCobrar}
            className="cursor-pointer rounded-lg border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs text-accent"
          >
            + Cobrar
          </button>
        )}
      </div>
      {cobros.length === 0 ? (
        <p className="m-0 text-xs text-muted-foreground">
          Sin cobros registrados
        </p>
      ) : (
        // El dato llega ordenado por fecha desc: el más reciente primero.
        cobros.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 border-b border-border/60 py-1.5 text-xs last:border-b-0"
          >
            <span className="text-muted-foreground">
              {formatFecha(c.fecha)}
            </span>
            <span className="min-w-0 flex-1 truncate">{c.concepto ?? "—"}</span>
            <span className="text-muted-foreground">
              {etiquetaMedioPago(c.medio_pago)}
            </span>
            <span className="font-bold text-accent">{formatARS(c.monto)}</span>
          </div>
        ))
      )}
    </div>
  );
}
