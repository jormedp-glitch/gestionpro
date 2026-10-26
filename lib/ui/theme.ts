// lib/ui/theme.ts
//
// Espejo de los acentos por rubro (D5). ImageResponse/satori no lee CSS vars,
// por lo que el favicon dinámico de cada negocio (P4) consume este mapa en
// lugar de var(--accent). El test de sync (theme.test.ts) verifica que cada
// valor coincide con app/globals.css.

export const RUBRO_ACCENT = {
  gimnasio: "#FF6B35",
  peluqueria: "#A78BFA",
  profesor: "#F472B6",
  veterinaria: "#34D399",
  servicio_tecnico: "#60A5FA",
} as const;

export type Rubro = keyof typeof RUBRO_ACCENT;

/**
 * Emoji por rubro (identidad visual). Fuente ÚNICA: el header del negocio, el
 * shell y el panel de administración (`/`) consumen este mapa. Antes el panel
 * tenía su propia copia (`rubroIcon` en `app/page.tsx`) que se quedó atrás al
 * sumar el rubro `profesor` (issue #205): el negocio se veía con 🏃 y en la
 * lista aparecía sin ícono.
 */
export const RUBRO_ICON = {
  gimnasio: "🏋️",
  peluqueria: "✂️",
  profesor: "🏃",
  veterinaria: "🐾",
  servicio_tecnico: "🔧",
} as const;

export const DEFAULT_RUBRO: Rubro = "gimnasio";

/**
 * Emoji del rubro; ante rubro desconocido cae al default (gimnasio).
 * Mismo criterio permisivo que `accentPorRubro`.
 */
export function iconoRubro(rubro: string): string {
  return (
    RUBRO_ICON[rubro as keyof typeof RUBRO_ICON] ?? RUBRO_ICON[DEFAULT_RUBRO]
  );
}

/** Acento de un rubro; ante rubro desconocido cae al default (gimnasio). */
export function accentPorRubro(rubro: string): string {
  return RUBRO_ACCENT[rubro as Rubro] ?? RUBRO_ACCENT[DEFAULT_RUBRO];
}
