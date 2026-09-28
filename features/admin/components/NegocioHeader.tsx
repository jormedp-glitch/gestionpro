// features/admin/components/NegocioHeader.tsx
//
// Encabezado compartido del negocio (client component, issue #183): icono +
// nombre + tabs por rubro + link a Reparaciones + link a Usuarios (solo
// owner) + logout. Se usa en DOS contextos de navegación distintos:
//   - dentro de NegocioShell (switcher por estado, sin cambio de ruta): las
//     tabs de vista son <button> y delegan en `onVista`;
//   - en las rutas que viven fuera del shell (/reparaciones, /usuarios): no
//     hay `onVista`, así que las tabs de vista son links con `?vista=` para
//     que el page server inicialice el shell en la vista pedida.
// `activa` marca la sección actual en ambos contextos: antes los links de
// ruta tenían la clase activa hardcodeada y todas las pestañas parecían
// seleccionadas.

"use client";

import { logout } from "@/lib/auth/actions";
import { Button } from "@/lib/ui/button";
import { cn } from "@/lib/ui/utils";
import type { Negocio } from "@/lib/auth/dal";

/** Vistas del shell (switcher por estado, sin cambio de ruta). */
export type Vista =
  | "dashboard"
  | "agenda"
  | "clientes"
  | "alumnos"
  | "rutinas"
  | "cobros"
  | "gastos";

/** Sección marcada como activa: vista del shell o ruta con guard server. */
export type SeccionNav = Vista | "reparaciones" | "usuarios";

/** Emoji del rubro (mismo mapa que usaba el shell). */
export function iconoRubro(rubro: string): string {
  if (rubro === "peluqueria") return "✂️";
  if (rubro === "veterinaria") return "🐾";
  if (rubro === "servicio_tecnico") return "🔧";
  return "🏋️";
}

/** Clases de tab activa/inactiva (idénticas a las del shell original). */
function estiloTab(activo: boolean) {
  return cn(
    "cursor-pointer rounded-lg border-none px-3.5 py-2 text-xs transition-colors",
    activo
      ? "bg-accent/15 font-medium text-accent"
      : "bg-transparent text-muted-foreground",
  );
}

/** Extra de los tabs-link: mismo box que los botones, sin subrayado. */
const estiloLink = "inline-flex items-center no-underline";

export function NegocioHeader({
  slug,
  negocio,
  esOwner,
  activa,
  onVista,
}: {
  slug: string;
  negocio: Negocio;
  esOwner: boolean;
  activa: SeccionNav;
  onVista?: (v: Vista) => void;
}) {
  // Tab de vista: botón cuando hay switcher (shell); link con `?vista=`
  // cuando se renderiza desde una ruta (el page server resuelve la vista).
  const tabVista = (v: Vista, label: string) =>
    onVista ? (
      <button
        key={v}
        onClick={() => onVista(v)}
        className={estiloTab(activa === v)}
      >
        {label}
      </button>
    ) : (
      <a
        key={v}
        href={"/" + slug + (v === "dashboard" ? "" : "?vista=" + v)}
        className={cn(estiloTab(activa === v), estiloLink)}
      >
        {label}
      </a>
    );

  const tabs =
    negocio.rubro === "servicio_tecnico" ? (
      <>
        {tabVista("dashboard", "📊 Dashboard")}
        {/* R6: sub-ruta con guard server-side, fuera del switcher. */}
        <a
          key="reparaciones"
          href={"/" + slug + "/reparaciones"}
          className={cn(estiloTab(activa === "reparaciones"), estiloLink)}
        >
          🔧 Reparaciones
        </a>
        {tabVista("gastos", "💸 Caja")}
      </>
    ) : negocio.rubro === "gimnasio" ? (
      // R1: el gimnasio no usa "Clientes"; su vista de personas es Alumnos
      // (ficha + IMC + acceso al portal).
      (
        [
          ["dashboard", "📊 Dashboard"],
          ["agenda", "📅 Agenda"],
          ["alumnos", "🏋️ Alumnos"],
          ["rutinas", "🏋️ Rutinas"],
          ["cobros", "💵 Cobros"],
          ["gastos", "💸 Caja"],
        ] as Array<[Vista, string]>
      ).map(([v, l]) => tabVista(v, l))
    ) : (
      (
        [
          ["dashboard", "📊 Dashboard"],
          ["agenda", "📅 Agenda"],
          ["clientes", "👥 Clientes"],
          ["gastos", "💸 Caja"],
        ] as Array<[Vista, string]>
      ).map(([v, l]) => tabVista(v, l))
    );

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-4 border-b border-accent/15 bg-card px-5">
      <span className="text-[1.3rem]">{iconoRubro(negocio.rubro)}</span>
      <span className="font-bold text-accent">{negocio.nombre}</span>
      <nav className="flex flex-1 gap-1 overflow-x-auto">
        {tabs}
        {/* R6 (D3): el link a /usuarios solo lo ve el owner. */}
        {esOwner && (
          <a
            href={"/" + slug + "/usuarios"}
            className={cn(estiloTab(activa === "usuarios"), estiloLink)}
          >
            👥 Usuarios
          </a>
        )}
      </nav>
      <form action={logout}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="text-muted-foreground"
        >
          Salir
        </Button>
      </form>
    </div>
  );
}
