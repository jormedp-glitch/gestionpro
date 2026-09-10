// features/reparaciones/components/CambiarEstadoForm.tsx
//
// Cambio de estado de una reparación (client component). El select ofrece
// SOLO los destinos permitidos por el mapa del dominio (R2): la UI nunca
// muestra transiciones inválidas y la Server Action las rechaza igualmente.
// Estados terminales (entregado, sin_reparacion — D-05) no ofrecen opciones.
// Migrado a tokens/primitivas (fase5-ui P7): select nativo → primitiva Select
// (Radix, operable por teclado REQ-UP-2). GOTCHA #203: Radix no emite campo
// FormData → hidden input `nuevo_estado` preserva el contrato de submit de la
// Server Action `cambiarEstado` (sin él, zod rechazaría siempre con error).

"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { ESTADOS, siguientesEstados } from "@/lib/domain/estados-reparacion";
import type { EstadoReparacion } from "@/lib/domain/estados-reparacion";
import { cambiarEstado } from "@/features/reparaciones/actions/reparaciones";
import type { CambiarEstadoResult } from "@/features/reparaciones/actions/reparaciones";
import { Button } from "@/lib/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/ui/select";

export function CambiarEstadoForm({
  slug,
  equipoId,
  estado,
}: {
  slug: string;
  equipoId: string;
  estado: EstadoReparacion;
}) {
  const [mostrar, setMostrar] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [state, formAction, pending] = useActionState(cambiarEstado, {
    ok: false,
  } as CambiarEstadoResult);
  const destinos = siguientesEstados(estado);

  // WhatsApp automático para listo_para_retirar / sin_reparacion (R3).
  useEffect(() => {
    if (state.ok && state.waUrl) window.open(state.waUrl, "_blank");
  }, [state]);

  // Estado terminal: sin opciones de transición (R2, D-05).
  if (destinos.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">🔄 Cambiar estado</h2>
        <button
          type="button"
          onClick={() => setMostrar(!mostrar)}
          className="rounded-lg bg-muted px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
        >
          {mostrar ? "Cancelar" : "Cambiar"}
        </button>
      </div>

      {mostrar && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="equipo_id" value={equipoId} />
          {/* #203: Radix Select no participa en FormData → hidden input
              con el mismo name preserva el contrato de la Server Action. */}
          <input type="hidden" name="nuevo_estado" value={nuevoEstado} />
          <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná el nuevo estado..." />
            </SelectTrigger>
            <SelectContent>
              {destinos.map((destino) => {
                const info = ESTADOS.find((e) => e.valor === destino)!;
                return (
                  <SelectItem key={destino} value={destino}>
                    {info.etiqueta}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <textarea
            name="comentario"
            placeholder="Comentario (opcional)..."
            rows={2}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {!state.ok && state.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}
          <Button
            type="submit"
            disabled={pending}
            variant="accent"
            className="w-full rounded-xl font-semibold"
          >
            {pending ? "Guardando..." : "Confirmar cambio de estado"}
          </Button>
        </form>
      )}
    </div>
  );
}
