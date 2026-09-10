// features/reparaciones/components/ReparacionesLista.tsx
//
// Listado de reparaciones (client component). Recibe los equipos ya leídos
// en el Server Component (R8) y hace el filtrado local por estado/búsqueda,
// con los 9 estados desde lib/domain (R1: esperando_aprobacion ya no falta).
// Migrado a tokens/primitivas (fase5-ui P7): cero clases de paleta cruda
// (text-gray-*, bg-white → tokens), EmptyState en lista vacía (REQ-FS-2) y
// primitivas lib/ui (Input, Badge, buttonVariants).

"use client";

import { useState } from "react";
import { ESTADOS, ESTADOS_CONTADORES } from "@/lib/domain/estados-reparacion";
import { formatARS } from "@/lib/domain/formato";
import { Badge } from "@/lib/ui/badge";
import { buttonVariants } from "@/lib/ui/button";
import { EmptyState } from "@/lib/ui/empty-state";
import { Input } from "@/lib/ui/input";
import { cn } from "@/lib/ui/utils";
import type { EquipoConCliente } from "@/features/reparaciones/data/reparaciones";

function diasEnTaller(f: string) {
  return Math.floor((Date.now() - new Date(f).getTime()) / 86400000);
}

function colorDias(d: number) {
  return d <= 3
    ? "text-green-600"
    : d <= 7
      ? "text-yellow-600"
      : "text-red-600 font-bold";
}

export function ReparacionesLista({
  slug,
  equipos,
}: {
  slug: string;
  equipos: EquipoConCliente[];
}) {
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const equiposFiltrados = equipos.filter((e) => {
    const coincideEstado =
      filtroEstado === "todos" || e.estado === filtroEstado;
    const coincideBusqueda =
      busqueda === "" ||
      e.numero_orden?.toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.clientes?.nombre || "")
        .toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      (e.marca || "").toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  function contarEstado(estado: string) {
    return equipos.filter((e) => e.estado === estado).length;
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔧 Reparaciones</h1>
          <p className="text-sm text-muted-foreground">
            {equipos.length} equipos en total
          </p>
        </div>
        <a
          href={"/" + slug + "/reparaciones/nuevo"}
          className={cn(buttonVariants({ variant: "accent" }), "rounded-lg")}
        >
          + Nueva reparación
        </a>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {ESTADOS_CONTADORES.map((val) => {
          const est = ESTADOS.find((e) => e.valor === val)!;
          const activo = filtroEstado === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => setFiltroEstado(activo ? "todos" : val)}
              className={cn(
                "rounded-xl border-2 p-3 text-center transition",
                activo ? "border-accent shadow-md" : "border-transparent",
                est.color,
              )}
            >
              <div className="text-2xl font-bold">{contarEstado(val)}</div>
              <div className="mt-1 text-xs leading-tight">{est.etiqueta}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          type="text"
          placeholder="Buscar por N° orden, cliente, marca..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {equiposFiltrados.length === 0 ? (
        equipos.length === 0 ? (
          <EmptyState
            title="¡Todavía no hay reparaciones!"
            description="Ingresá la primera."
            action={
              <a
                href={"/" + slug + "/reparaciones/nuevo"}
                className={cn(
                  buttonVariants({ variant: "accent" }),
                  "rounded-lg",
                )}
              >
                + Nueva reparación
              </a>
            }
          />
        ) : (
          <EmptyState title="No hay equipos que coincidan." />
        )
      ) : (
        <div className="space-y-2">
          {equiposFiltrados.map((equipo) => {
            const estadoInfo = ESTADOS.find((e) => e.valor === equipo.estado);
            const dias = diasEnTaller(equipo.fecha_ingreso);
            return (
              <a
                key={equipo.id}
                href={"/" + slug + "/reparaciones/" + equipo.id}
                className="block rounded-xl border border-border bg-card p-4 transition hover:border-accent/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-accent">
                        {equipo.numero_orden}
                      </span>
                      <Badge
                        className={cn("border-transparent", estadoInfo?.color)}
                      >
                        {estadoInfo?.etiqueta}
                      </Badge>
                      {equipo.estado === "listo_para_retirar" && (
                        <span className="animate-pulse rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                          ¡Listo!
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-medium">
                      {equipo.categoria}
                      {equipo.marca ? " · " + equipo.marca : ""}
                      {equipo.modelo ? " " + equipo.modelo : ""}
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      👤 {equipo.clientes?.nombre || "Sin cliente"}
                      {equipo.tecnico_asignado
                        ? " · 🔧 " + equipo.tecnico_asignado
                        : ""}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-muted-foreground">
                      {equipo.problema_reportado}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={"text-sm " + colorDias(dias)}>
                      {dias === 0 ? "Hoy" : dias + "d"}
                    </div>
                    {equipo.precio_final != null && (
                      <div className="mt-1 text-sm font-bold">
                        {formatARS(equipo.precio_final)}
                      </div>
                    )}
                    {equipo.presupuesto != null &&
                      equipo.precio_final == null && (
                        <div className="mt-1 text-sm text-yellow-600">
                          {formatARS(equipo.presupuesto)}
                        </div>
                      )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
