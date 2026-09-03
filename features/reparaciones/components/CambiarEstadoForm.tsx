// features/reparaciones/components/CambiarEstadoForm.tsx
//
// Cambio de estado de una reparación (client component). El select ofrece
// SOLO los destinos permitidos por el mapa del dominio (R2): la UI nunca
// muestra transiciones inválidas y la Server Action las rechaza igualmente.
// Estados terminales (entregado, sin_reparacion — D-05) no ofrecen opciones.

"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { ESTADOS, siguientesEstados } from "@/lib/domain/estados-reparacion";
import type { EstadoReparacion } from "@/lib/domain/estados-reparacion";
import { cambiarEstado } from "@/features/reparaciones/actions/reparaciones";
import type { CambiarEstadoResult } from "@/features/reparaciones/actions/reparaciones";

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
    <div className="bg-white border rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-700">🔄 Cambiar estado</h2>
        <button
          type="button"
          onClick={() => setMostrar(!mostrar)}
          className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition"
        >
          {mostrar ? "Cancelar" : "Cambiar"}
        </button>
      </div>

      {mostrar && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="equipo_id" value={equipoId} />
          <select
            name="nuevo_estado"
            defaultValue=""
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="" disabled>
              Seleccioná el nuevo estado...
            </option>
            {destinos.map((destino) => {
              const info = ESTADOS.find((e) => e.valor === destino)!;
              return (
                <option key={destino} value={destino}>
                  {info.etiqueta}
                </option>
              );
            })}
          </select>
          <textarea
            name="comentario"
            placeholder="Comentario (opcional)..."
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          {!state.ok && state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Confirmar cambio de estado"}
          </button>
        </form>
      )}
    </div>
  );
}
