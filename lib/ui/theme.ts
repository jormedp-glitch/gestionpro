// lib/ui/theme.ts
//
// Espejo de los acentos por rubro (D5). ImageResponse/satori no lee CSS vars,
// por lo que el favicon dinámico de cada negocio (P4) consume este mapa en
// lugar de var(--accent). El test de sync (theme.test.ts) verifica que cada
// valor coincide con app/globals.css.

export const RUBRO_ACCENT = {
  gimnasio: "#FF6B35",
  peluqueria: "#A78BFA",
  veterinaria: "#34D399",
  servicio_tecnico: "#60A5FA",
} as const;

export type Rubro = keyof typeof RUBRO_ACCENT;

export const DEFAULT_RUBRO: Rubro = "gimnasio";

/** Acento de un rubro; ante rubro desconocido cae al default (gimnasio). */
export function accentPorRubro(rubro: string): string {
  return RUBRO_ACCENT[rubro as Rubro] ?? RUBRO_ACCENT[DEFAULT_RUBRO];
}
