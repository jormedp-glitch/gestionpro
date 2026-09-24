// features/gym/components/useAvisoAccion.ts
//
// Aviso por toast del resultado de una Server Action de gym (patrón `manejado`
// del repo, factorizado desde DetalleAlumno): los efectos se keyean sobre el
// OBJETO de estado (no sobre el string de error) para que cada resultado se
// avise una sola vez, aunque el mensaje se repita.

"use client";

import { useEffect, useRef } from "react";

/** Contrato mínimo de una Server Action de gym: `ok` + error opcional. */
type ResultadoAccion = { ok: boolean; error?: string };

export function useAvisoAccion(
  state: ResultadoAccion,
  showToast: (msg: string) => void,
  mensajeOk: string,
) {
  const manejado = useRef(false);
  const errorAvisado = useRef<ResultadoAccion | null>(null);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast(mensajeOk);
  }, [state, showToast, mensajeOk]);

  useEffect(() => {
    if (!state.error || errorAvisado.current === state) return;
    errorAvisado.current = state;
    showToast(state.error);
  }, [state, showToast]);
}
