// features/clientes/components/ClientesLista.tsx
//
// Listado de clientes (client component). Recibe los clientes ya leídos en el
// Server Component (R8). Las escrituras (pagar/eliminar) pasan por Server
// Actions (R9); el WhatsApp de cobro usa `mensajeCobro` (variante canónica
// A6) con el builder del dominio (R4). Migrado a primitivas lib/ui + tokens
// (fase5-ui P6): cero estilos inline (REQ-TT-3); EmptyState en lista vacía
// (REQ-FS-2). El color por prop se eliminó: los estados usan clases token
// (mapeo discovery #200) y el acento rubro se resuelve vía CSS var.

"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import {
  eliminarCliente,
  pagarCliente,
} from "@/features/clientes/actions/clientes";
import type { ClienteActionResult } from "@/features/clientes/actions/clientes";
import { mensajeCobro } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { formatARS, formatFecha } from "@/lib/domain/formato";
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import { cn } from "@/lib/ui/utils";
import type { Cliente } from "@/features/clientes/data/clientes";

function etiquetaEstado(estado: string) {
  if (estado === "activo") return "Activo";
  if (estado === "vence_pronto") return "Vence pronto";
  return "Vencido";
}

/** Color del estado → clase token (discovery #200: mapeo exacto a Tailwind 4). */
function claseColorEstado(estado: string) {
  if (estado === "activo") return "text-emerald-400";
  if (estado === "vence_pronto") return "text-amber-400";
  return "text-red-400";
}

function claseFondoEstado(estado: string) {
  if (estado === "activo") return "bg-emerald-400/15";
  if (estado === "vence_pronto") return "bg-amber-400/15";
  return "bg-red-400/15";
}

/** Botón "✓ Pagó": registra el pago vía Server Action y avisa con toast. */
function PagarClienteBoton({
  slug,
  clienteId,
  showToast,
}: {
  slug: string;
  clienteId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(pagarCliente, {
    ok: false,
  } as ClienteActionResult);
  const manejado = useRef(false);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast("Pagado ✓");
  }, [state, showToast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      <button
        type="submit"
        className="cursor-pointer rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-400"
      >
        ✓ Pagó
      </button>
    </form>
  );
}

/** Botón "✕": elimina el cliente vía Server Action y avisa con toast. */
function EliminarClienteBoton({
  slug,
  clienteId,
  showToast,
}: {
  slug: string;
  clienteId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(eliminarCliente, {
    ok: false,
  } as ClienteActionResult);
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
      <input type="hidden" name="cliente_id" value={clienteId} />
      <button
        type="submit"
        className="cursor-pointer rounded-lg border-none bg-red-400/10 px-2 py-1 text-xs text-red-400"
      >
        ✕
      </button>
    </form>
  );
}

export function ClientesLista({
  slug,
  clientes,
  negocioNombre,
  icon,
  onNuevoCliente,
  showToast,
}: {
  slug: string;
  clientes: Cliente[];
  negocioNombre: string;
  icon: string;
  onNuevoCliente: () => void;
  showToast: (msg: string) => void;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-[1.6rem]">{icon} Clientes</h2>
        <Button
          variant="accent"
          onClick={onNuevoCliente}
          className="rounded-[10px] font-bold"
        >
          + Agregar
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        {clientes.length === 0 && (
          <EmptyState
            title="Sin clientes todavía"
            action={
              <Button variant="accent" onClick={onNuevoCliente}>
                + Agregar cliente
              </Button>
            }
          />
        )}
        {clientes.map((c) => {
          const telefono = c.telefono;
          return (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] items-center gap-2 border-b border-border/60 px-4 py-3.5"
            >
              <div>
                <div className="text-sm font-medium">{c.nombre}</div>
                {telefono && (
                  <div className="text-xs text-muted-foreground">
                    📱 {telefono}
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{c.plan}</div>
              <div className="text-sm font-bold text-accent">
                {formatARS(c.cuota)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatFecha(c.vence || "")}
              </div>
              <Badge
                className={cn(
                  "border-transparent",
                  claseFondoEstado(c.estado),
                  claseColorEstado(c.estado),
                )}
              >
                {etiquetaEstado(c.estado)}
              </Badge>
              <div className="flex gap-1.5">
                {c.estado !== "activo" && (
                  <PagarClienteBoton
                    slug={slug}
                    clienteId={c.id}
                    showToast={showToast}
                  />
                )}
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
                    📲
                  </button>
                )}
                <EliminarClienteBoton
                  slug={slug}
                  clienteId={c.id}
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
