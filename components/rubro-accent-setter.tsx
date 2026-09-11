// components/rubro-accent-setter.tsx
//
// Island client (D1/D2/D4): renderiza null y, en un efecto, setea
// `html[data-rubro]` con el rubro del negocio activo para que
// var(--color-accent) resuelva al acento del rubro (REQ-TT-2). Cleanup
// elimina el dataset al desmontar (vuelve al acento default de :root).
// Rubros desconocidos caen al default (mismo criterio que accentPorRubro).

"use client";

import { useEffect } from "react";
import { DEFAULT_RUBRO, RUBRO_ACCENT, type Rubro } from "@/lib/ui/theme";

export function RubroAccentSetter({ rubro }: { rubro: string }) {
  useEffect(() => {
    const key: Rubro = rubro in RUBRO_ACCENT ? (rubro as Rubro) : DEFAULT_RUBRO;
    document.documentElement.dataset.rubro = key;
    return () => {
      delete document.documentElement.dataset.rubro;
    };
  }, [rubro]);

  return null;
}
