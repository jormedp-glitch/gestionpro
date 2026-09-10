// features/seguimiento/components/SeguimientoContenido.tsx
//
// Seguimiento PÚBLICO de una reparación (client component, R11). Extraído
// verbatim del page `app/[slug]/seguimiento/[orden]/page.tsx` con las
// invariantes D-11 intactas:
//   - el token es la CAPACIDAD de acceso; [orden] es solo informativo;
//   - solo se consulta el RPC `obtener_seguimiento_publico` (allowlist de la
//     migración 0002 — SIN CAMBIOS en columnas devueltas);
//   - token ausente o con formato no-UUID → enlace vencido, sin datos.
// No se construyen deep links de WhatsApp: la página pública solo renderiza
// los datos de la allowlist.
//
// Único cambio de fuente: ESTADOS y ORDEN_FLUJO vienen de lib/domain (R1).
// ORDEN_FLUJO de 8 pasos corrige el bug indexActual=-1 para
// esperando_aprobacion/aprobado (antes no aparecían en el progreso).
// Migrado a tokens/primitivas (fase5-ui P7): cero clases de paleta cruda
// (neutros → tokens), EmptyState en el estado sin datos
// (enlace vencido, REQ-FS-2 seguimiento), estado → primitiva Badge.

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ESTADOS, ORDEN_FLUJO } from "@/lib/domain/estados-reparacion";
import type { EstadoReparacion } from "@/lib/domain/estados-reparacion";
import { formatFechaHora } from "@/lib/domain/formato";
import { Badge } from "@/lib/ui/badge";
import { EmptyState } from "@/lib/ui/empty-state";
import { cn } from "@/lib/ui/utils";

// D-11: el token es la capacidad de acceso; [orden] es solo informativo.
// Formato UUID canónico; cualquier otro valor cae directo a enlace vencido.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface HistorialPublico {
  estado_nuevo: string;
  fecha: string;
  comentario: string | null;
}

// Contrato de la allowlist de obtener_seguimiento_publico (spec, Domain 3).
interface SeguimientoPublico {
  estado: string;
  numero_orden: string;
  categoria: string;
  marca: string | null;
  modelo: string | null;
  problema_reportado: string;
  fecha_ingreso: string;
  fecha_estimada_entrega: string | null;
  fecha_entrega: string | null;
  presupuesto: number | null;
  precio_final: number | null;
  cliente_nombre: string | null;
  negocio_nombre: string | null;
  historial: HistorialPublico[];
}

export function CargandoReparacion() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="text-center text-muted-foreground">
        <div className="mb-2 text-4xl">🔍</div>
        <p>Consultando el estado de la reparación...</p>
      </div>
    </div>
  );
}

export function SeguimientoContenido() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [equipo, setEquipo] = useState<SeguimientoPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enlaceVencido, setEnlaceVencido] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      // D-11 (sin gracia): sin token o con formato inválido → enlace vencido.
      if (!token || !UUID_REGEX.test(token)) {
        setEnlaceVencido(true);
        setCargando(false);
        return;
      }

      const { data } = await supabase.rpc("obtener_seguimiento_publico", {
        p_token: token,
      });
      if (!activo) return;

      const fila = (Array.isArray(data) ? data[0] : data) as
        SeguimientoPublico | undefined;

      if (!fila) {
        // Token desconocido o revocado → enlace vencido, sin datos.
        setEnlaceVencido(true);
      } else {
        setEquipo(fila);
      }
      setCargando(false);
    }

    cargarDatos();
    return () => {
      activo = false;
    };
  }, [token]);

  if (cargando) return <CargandoReparacion />;

  if (enlaceVencido)
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <EmptyState
          className="w-full max-w-sm"
          title="🔗 Enlace no válido"
          description="Este enlace de seguimiento no es válido o ya no está disponible. Solicite uno nuevo en el taller."
        />
      </div>
    );

  if (!equipo) return null;

  const estadoInfo = ESTADOS.find((e) => e.valor === equipo.estado);
  const indexActual = ORDEN_FLUJO.indexOf(equipo.estado as EstadoReparacion);
  const esListo = equipo.estado === "listo_para_retirar";
  const esEntregado = equipo.estado === "entregado";
  const esSinReparacion = equipo.estado === "sin_reparacion";

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* HEADER */}
        <div className="pt-6 pb-2 text-center">
          <div className="mb-1 text-3xl">🔧</div>
          <h1 className="text-xl font-bold">
            {equipo.negocio_nombre || "Servicio Técnico"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento de reparación
          </p>
        </div>

        {/* ESTADO PRINCIPAL */}
        <div
          className={cn(
            "rounded-2xl p-6 text-center shadow-sm",
            esListo
              ? "bg-green-500"
              : esSinReparacion
                ? "bg-red-100"
                : esEntregado
                  ? "bg-green-100"
                  : "bg-card",
          )}
        >
          <div className="mb-3 text-5xl">{estadoInfo?.icono}</div>
          <div className="mb-1 font-mono text-sm font-bold opacity-60">
            {equipo.numero_orden}
          </div>
          <h2
            className={cn(
              "mb-2 text-2xl font-bold",
              esListo ? "text-white" : "",
            )}
          >
            {estadoInfo?.etiqueta}
          </h2>
          <p
            className={cn(
              "text-sm",
              esListo ? "text-green-100" : "text-muted-foreground",
            )}
          >
            {equipo.categoria}
            {equipo.marca ? " · " + equipo.marca : ""}
            {equipo.modelo ? " " + equipo.modelo : ""}
          </p>
          {esListo && (
            <div className="mt-4 rounded-xl bg-card/20 p-3">
              <p className="font-semibold text-white">
                Su equipo está listo para retirar.
              </p>
              {equipo.precio_final && (
                <p className="mt-1 text-sm text-green-100">
                  Total a abonar: $
                  {Number(equipo.precio_final).toLocaleString("es-AR")}
                </p>
              )}
            </div>
          )}
          {esSinReparacion && (
            <div className="mt-4 rounded-xl bg-red-50 p-3">
              <p className="text-sm text-red-700">
                No fue posible realizar la reparación. Puede pasar a retirar su
                equipo sin costo.
              </p>
            </div>
          )}
        </div>

        {/* PROGRESO */}
        {!esSinReparacion && (
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
              Progreso
            </h3>
            <div className="space-y-3">
              {ORDEN_FLUJO.map((val, idx) => {
                const est = ESTADOS.find((e) => e.valor === val)!;
                const completado = idx < indexActual || esEntregado;
                const actual = val === equipo.estado;
                return (
                  <div key={val} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        completado
                          ? "bg-green-500 text-white"
                          : actual
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {completado ? "✓" : actual ? "●" : "○"}
                    </div>
                    <span
                      aria-current={actual ? "step" : undefined}
                      className={cn(
                        "text-sm",
                        actual
                          ? "font-bold text-accent"
                          : completado
                            ? "text-green-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {est.etiqueta}
                    </span>
                    {actual && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                        Actual
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DETALLE */}
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Detalle del equipo
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{equipo.cliente_nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ingreso</span>
              <span>{formatFechaHora(equipo.fecha_ingreso)}</span>
            </div>
            {equipo.fecha_estimada_entrega && !esEntregado && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrega estimada</span>
                <span>{equipo.fecha_estimada_entrega}</span>
              </div>
            )}
            {equipo.fecha_entrega && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entregado el</span>
                <span>{formatFechaHora(equipo.fecha_entrega)}</span>
              </div>
            )}
            <div className="border-t border-border/60 pt-2">
              <span className="mb-1 block text-muted-foreground">
                Problema reportado
              </span>
              <span>{equipo.problema_reportado}</span>
            </div>
          </div>
        </div>

        {/* HISTORIAL */}
        {equipo.historial.length > 0 && (
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Historial de actualizaciones
            </h3>
            <div className="space-y-3">
              {[...equipo.historial].reverse().map((h) => {
                const est = ESTADOS.find((e) => e.valor === h.estado_nuevo);
                return (
                  <div key={h.fecha + h.estado_nuevo} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"></div>
                      <div className="mt-1 w-0.5 flex-1 bg-border/60"></div>
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("border-transparent", est?.color)}>
                          {est?.etiqueta}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFechaHora(h.fecha)}
                        </span>
                      </div>
                      {h.comentario && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {h.comentario}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pb-8 text-center">
          <p className="text-xs text-muted-foreground">
            Esta página se actualiza con el estado de su reparación.
          </p>
        </div>
      </div>
    </div>
  );
}
