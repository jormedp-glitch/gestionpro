"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const ESTADOS = [
  {
    valor: "recibido",
    etiqueta: "Recibido",
    color: "bg-gray-100 text-gray-600",
    icono: "📥",
  },
  {
    valor: "en_diagnostico",
    etiqueta: "En diagnóstico",
    color: "bg-blue-100 text-blue-700",
    icono: "🔍",
  },
  {
    valor: "presupuesto_enviado",
    etiqueta: "Presupuesto enviado",
    color: "bg-yellow-100 text-yellow-700",
    icono: "💰",
  },
  {
    valor: "esperando_aprobacion",
    etiqueta: "Esperando aprobación",
    color: "bg-orange-100 text-orange-700",
    icono: "⏳",
  },
  {
    valor: "aprobado",
    etiqueta: "Aprobado",
    color: "bg-cyan-100 text-cyan-700",
    icono: "✅",
  },
  {
    valor: "en_reparacion",
    etiqueta: "En reparación",
    color: "bg-purple-100 text-purple-700",
    icono: "🔧",
  },
  {
    valor: "listo_para_retirar",
    etiqueta: "Listo para retirar",
    color: "bg-green-100 text-green-700",
    icono: "🎉",
  },
  {
    valor: "entregado",
    etiqueta: "Entregado",
    color: "bg-green-200 text-green-800",
    icono: "✔️",
  },
  {
    valor: "sin_reparacion",
    etiqueta: "Sin reparación",
    color: "bg-red-100 text-red-700",
    icono: "❌",
  },
];

const ORDEN_FLUJO = [
  "recibido",
  "en_diagnostico",
  "presupuesto_enviado",
  "en_reparacion",
  "listo_para_retirar",
  "entregado",
];

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

function CargandoReparacion() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <p>Consultando el estado de la reparación...</p>
      </div>
    </div>
  );
}

function SeguimientoContenido() {
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

  function formatFecha(f: string) {
    return new Date(f).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (cargando) return <CargandoReparacion />;

  if (enlaceVencido)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Enlace no válido
          </h1>
          <p className="text-gray-500 text-sm">
            Este enlace de seguimiento no es válido o ya no está disponible.
            Solicite uno nuevo en el taller.
          </p>
        </div>
      </div>
    );

  if (!equipo) return null;

  const estadoInfo = ESTADOS.find((e) => e.valor === equipo.estado);
  const indexActual = ORDEN_FLUJO.indexOf(equipo.estado);
  const esListo = equipo.estado === "listo_para_retirar";
  const esEntregado = equipo.estado === "entregado";
  const esSinReparacion = equipo.estado === "sin_reparacion";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* HEADER */}
        <div className="text-center pt-6 pb-2">
          <div className="text-3xl mb-1">🔧</div>
          <h1 className="text-xl font-bold text-gray-800">
            {equipo.negocio_nombre || "Servicio Técnico"}
          </h1>
          <p className="text-gray-400 text-sm">Seguimiento de reparación</p>
        </div>

        {/* ESTADO PRINCIPAL */}
        <div
          className={
            "rounded-2xl p-6 text-center shadow-sm " +
            (esListo
              ? "bg-green-500"
              : esSinReparacion
                ? "bg-red-100"
                : esEntregado
                  ? "bg-green-100"
                  : "bg-white")
          }
        >
          <div className="text-5xl mb-3">{estadoInfo?.icono}</div>
          <div className="font-mono text-sm font-bold mb-1 opacity-60">
            {equipo.numero_orden}
          </div>
          <h2
            className={
              "text-2xl font-bold mb-2 " +
              (esListo ? "text-white" : "text-gray-800")
            }
          >
            {estadoInfo?.etiqueta}
          </h2>
          <p
            className={
              "text-sm " + (esListo ? "text-green-100" : "text-gray-500")
            }
          >
            {equipo.categoria}
            {equipo.marca ? " · " + equipo.marca : ""}
            {equipo.modelo ? " " + equipo.modelo : ""}
          </p>
          {esListo && (
            <div className="mt-4 bg-white bg-opacity-20 rounded-xl p-3">
              <p className="text-white font-semibold">
                Su equipo está listo para retirar.
              </p>
              {equipo.precio_final && (
                <p className="text-green-100 text-sm mt-1">
                  Total a abonar: $
                  {Number(equipo.precio_final).toLocaleString("es-AR")}
                </p>
              )}
            </div>
          )}
          {esSinReparacion && (
            <div className="mt-4 bg-red-50 rounded-xl p-3">
              <p className="text-red-700 text-sm">
                No fue posible realizar la reparación. Puede pasar a retirar su
                equipo sin costo.
              </p>
            </div>
          )}
        </div>

        {/* PROGRESO */}
        {!esSinReparacion && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">
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
                      className={
                        "w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 font-bold " +
                        (completado
                          ? "bg-green-500 text-white"
                          : actual
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-400")
                      }
                    >
                      {completado ? "✓" : actual ? "●" : "○"}
                    </div>
                    <span
                      className={
                        "text-sm " +
                        (actual
                          ? "font-bold text-blue-700"
                          : completado
                            ? "text-green-700"
                            : "text-gray-400")
                      }
                    >
                      {est.etiqueta}
                    </span>
                    {actual && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
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
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Detalle del equipo
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Cliente</span>
              <span className="text-gray-800 font-medium">
                {equipo.cliente_nombre}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ingreso</span>
              <span className="text-gray-800">
                {formatFecha(equipo.fecha_ingreso)}
              </span>
            </div>
            {equipo.fecha_estimada_entrega && !esEntregado && (
              <div className="flex justify-between">
                <span className="text-gray-400">Entrega estimada</span>
                <span className="text-gray-800">
                  {equipo.fecha_estimada_entrega}
                </span>
              </div>
            )}
            {equipo.fecha_entrega && (
              <div className="flex justify-between">
                <span className="text-gray-400">Entregado el</span>
                <span className="text-gray-800">
                  {formatFecha(equipo.fecha_entrega)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t">
              <span className="text-gray-400 block mb-1">
                Problema reportado
              </span>
              <span className="text-gray-700">{equipo.problema_reportado}</span>
            </div>
          </div>
        </div>

        {/* HISTORIAL */}
        {equipo.historial.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">
              Historial de actualizaciones
            </h3>
            <div className="space-y-3">
              {[...equipo.historial].reverse().map((h) => {
                const est = ESTADOS.find((e) => e.valor === h.estado_nuevo);
                return (
                  <div key={h.fecha + h.estado_nuevo} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                      <div className="w-0.5 bg-gray-100 flex-1 mt-1"></div>
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={
                            "text-xs px-2 py-0.5 rounded-full " + est?.color
                          }
                        >
                          {est?.etiqueta}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatFecha(h.fecha)}
                        </span>
                      </div>
                      {h.comentario && (
                        <p className="text-sm text-gray-600 mt-1">
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

        <div className="text-center pb-8">
          <p className="text-xs text-gray-400">
            Esta página se actualiza con el estado de su reparación.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SeguimientoPage() {
  return (
    <Suspense fallback={<CargandoReparacion />}>
      <SeguimientoContenido />
    </Suspense>
  );
}
