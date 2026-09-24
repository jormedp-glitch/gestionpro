// features/cobros/components/CobrosNegocio.tsx
//
// Historial de cobros del negocio + total del mes (R1, R12; client component
// presentacional). Se renderiza como tab del shell del rubro gimnasio: no lee
// datos, recibe los cobros y los clientes ya leídos por el Server Component y
// resuelve el nombre del cliente en memoria. Mismo criterio visual que
// CobrosCliente (compacto, tokens, sin estilos inline).

"use client";

import { formatARS, formatFecha } from "@/lib/domain/formato";
import { Card } from "@/lib/ui/card";
import type { Cobro } from "@/features/cobros/data/cobros";

/** Etiqueta capitalizada del medio de pago (R10). */
function etiquetaMedioPago(medio: string): string {
  return medio.charAt(0).toUpperCase() + medio.slice(1);
}

export function CobrosNegocio({
  cobros,
  clientes,
  hoy,
}: {
  cobros: Cobro[];
  clientes: Array<{ id: string; nombre: string }>;
  hoy: string;
}) {
  // R12: el total del mes se calcula sobre los cobros ya leídos, filtrando
  // por prefijo yyyy-mm (mismo criterio que el resumen de gastos del shell).
  const mesActual = hoy.slice(0, 7);
  const totalMes = cobros
    .filter((c) => c.fecha.startsWith(mesActual))
    .reduce((s, c) => s + Number(c.monto || 0), 0);

  // R1: el nombre del cliente se resuelve en memoria; un cliente borrado o de
  // otro negocio cae a "—".
  const nombrePorCliente = new Map(clientes.map((c) => [c.id, c.nombre]));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-[1.6rem]">💵 Cobros</h2>
        <span className="text-sm text-muted-foreground">
          Total del mes:{" "}
          <span className="font-bold text-accent">{formatARS(totalMes)}</span>
        </span>
      </div>
      <Card className="overflow-hidden p-0">
        {cobros.length === 0 ? (
          <p className="m-0 px-4 py-3.5 text-sm text-muted-foreground">
            Sin cobros registrados
          </p>
        ) : (
          /* En pantallas angostas la fila scrollea en horizontal en vez de
             desbordar la tarjeta. */
          <div className="overflow-x-auto">
            {cobros.map((cobro) => (
              <div
                key={cobro.id}
                className="grid min-w-[640px] grid-cols-[auto_1fr_1.4fr_auto_auto] items-center gap-3 border-b border-border/60 px-4 py-3.5 text-sm"
              >
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatFecha(cobro.fecha)}
                </span>
                <span className="min-w-0 truncate">
                  {nombrePorCliente.get(cobro.cliente_id) ?? "—"}
                </span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {cobro.concepto ?? "—"}
                </span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {etiquetaMedioPago(cobro.medio_pago)}
                </span>
                <span className="whitespace-nowrap font-bold text-accent">
                  {formatARS(cobro.monto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
