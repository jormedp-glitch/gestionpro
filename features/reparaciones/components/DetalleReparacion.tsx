// features/reparaciones/components/DetalleReparacion.tsx
//
// Detalle de una reparación (client component). Recibe el equipo, historial
// y repuestos ya leídos en el Server Component (R8). Las mutaciones
// (presupuesto, repuestos, entrega, cambio de estado) son Server Actions
// validadas con zod (R9); el estado/select de transiciones sale del mapa del
// dominio (R2) y el WhatsApp de los links wa.me se arma con
// lib/domain/mensajes + wa.ts (R3/R4).

"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  agregarRepuesto,
  eliminarRepuesto,
  guardarPresupuesto,
  marcarEntregado,
} from "@/features/reparaciones/actions/reparaciones";
import type {
  ActionResult,
  CambiarEstadoResult,
} from "@/features/reparaciones/actions/reparaciones";
import { ESTADOS } from "@/lib/domain/estados-reparacion";
import { formatARS, formatFechaHora } from "@/lib/domain/formato";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { CambiarEstadoForm } from "./CambiarEstadoForm";
import type {
  EquipoConCliente,
  HistorialReparacion,
  RepuestoReparacion,
} from "@/features/reparaciones/data/reparaciones";

export function DetalleReparacion({
  slug,
  equipo,
  historial,
  repuestos,
}: {
  slug: string;
  equipo: EquipoConCliente;
  historial: HistorialReparacion[];
  repuestos: RepuestoReparacion[];
}) {
  const router = useRouter();

  const [mostrarPresupuesto, setMostrarPresupuesto] = useState(false);
  const [presupuestoState, presupuestoAction, presupuestoPending] =
    useActionState(guardarPresupuesto, { ok: false } as CambiarEstadoResult);

  const [mostrarRepuesto, setMostrarRepuesto] = useState(false);
  const [repuestoState, repuestoAction, repuestoPending] = useActionState(
    agregarRepuesto,
    { ok: false } as ActionResult,
  );

  const [mostrarPrecioFinal, setMostrarPrecioFinal] = useState(false);
  const [entregadoState, entregadoAction, entregadoPending] = useActionState(
    marcarEntregado,
    { ok: false } as ActionResult,
  );

  // WhatsApp del presupuesto al confirmarse la acción (R3/R4).
  useEffect(() => {
    if (presupuestoState.ok && presupuestoState.waUrl) {
      window.open(presupuestoState.waUrl, "_blank");
    }
  }, [presupuestoState]);

  const totalRepuestos = repuestos.reduce(
    (acc, r) => acc + r.precio_cobrado * r.cantidad,
    0,
  );
  const estadoInfo = ESTADOS.find((e) => e.valor === equipo.estado);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-16">
      {/* ENCABEZADO */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-blue-700">
              {equipo.numero_orden}
            </span>
            <span
              className={"text-xs px-2 py-1 rounded-full " + estadoInfo?.color}
            >
              {estadoInfo?.etiqueta}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {equipo.categoria}
            {equipo.marca ? " · " + equipo.marca : ""}
            {equipo.modelo ? " " + equipo.modelo : ""}
          </p>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <h2 className="font-semibold text-gray-700 mb-2">👤 Cliente</h2>
        <p className="font-medium text-gray-800">
          {equipo.clientes?.nombre || "Sin cliente"}
        </p>
        {equipo.clientes?.telefono && (
          <a
            href={buildWhatsAppLink(equipo.clientes.telefono, "")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 text-sm hover:underline"
          >
            📱 {equipo.clientes.telefono}
          </a>
        )}
      </div>

      {/* EQUIPO */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <h2 className="font-semibold text-gray-700 mb-2">💻 Equipo</h2>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <span className="text-gray-500">Categoría</span>
          <span className="text-gray-800">{equipo.categoria}</span>
          {equipo.marca && (
            <>
              <span className="text-gray-500">Marca</span>
              <span className="text-gray-800">{equipo.marca}</span>
            </>
          )}
          {equipo.modelo && (
            <>
              <span className="text-gray-500">Modelo</span>
              <span className="text-gray-800">{equipo.modelo}</span>
            </>
          )}
          {equipo.numero_serie && (
            <>
              <span className="text-gray-500">N° Serie</span>
              <span className="text-gray-800">{equipo.numero_serie}</span>
            </>
          )}
          {equipo.accesorios && (
            <>
              <span className="text-gray-500">Accesorios</span>
              <span className="text-gray-800">{equipo.accesorios}</span>
            </>
          )}
          {equipo.tecnico_asignado && (
            <>
              <span className="text-gray-500">Técnico</span>
              <span className="text-gray-800">{equipo.tecnico_asignado}</span>
            </>
          )}
          <span className="text-gray-500">Ingreso</span>
          <span className="text-gray-800">
            {formatFechaHora(equipo.fecha_ingreso)}
          </span>
          {equipo.fecha_estimada_entrega && (
            <>
              <span className="text-gray-500">Entrega est.</span>
              <span className="text-gray-800">
                {equipo.fecha_estimada_entrega}
              </span>
            </>
          )}
        </div>
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">Problema reportado</p>
          <p className="text-sm text-gray-800">{equipo.problema_reportado}</p>
        </div>
        {equipo.observaciones_internas && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Notas internas</p>
            <p className="text-sm text-gray-600 italic">
              {equipo.observaciones_internas}
            </p>
          </div>
        )}
      </div>

      {/* PRESUPUESTO Y PRECIO */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <h2 className="font-semibold text-gray-700 mb-3">
          💰 Presupuesto y cobro
        </h2>
        <div className="flex gap-3 flex-wrap">
          {equipo.presupuesto != null && (
            <div className="bg-yellow-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Presupuesto</p>
              <p className="font-bold text-yellow-700">
                {formatARS(equipo.presupuesto)}
              </p>
            </div>
          )}
          {totalRepuestos > 0 && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Repuestos</p>
              <p className="font-bold text-blue-700">
                {formatARS(totalRepuestos)}
              </p>
            </div>
          )}
          {equipo.precio_final != null && (
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Cobrado</p>
              <p className="font-bold text-green-700">
                {formatARS(equipo.precio_final)}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {equipo.presupuesto == null && (
            <button
              type="button"
              onClick={() => setMostrarPresupuesto(!mostrarPresupuesto)}
              className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition"
            >
              + Cargar presupuesto
            </button>
          )}
          {equipo.estado === "listo_para_retirar" &&
            equipo.precio_final == null && (
              <button
                type="button"
                onClick={() => setMostrarPrecioFinal(!mostrarPrecioFinal)}
                className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition"
              >
                ✓ Marcar entregado y cobrado
              </button>
            )}
        </div>

        {/* Form presupuesto */}
        {mostrarPresupuesto && (
          <form
            action={presupuestoAction}
            className="mt-3 pt-3 border-t flex gap-2"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <input
              type="number"
              name="monto"
              placeholder="Monto $"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              type="submit"
              disabled={presupuestoPending}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition disabled:opacity-50"
            >
              {presupuestoPending ? "..." : "Enviar por WA"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarPresupuesto(false)}
              className="text-gray-400 hover:text-gray-600 px-2"
            >
              ✕
            </button>
          </form>
        )}
        {!presupuestoState.ok && presupuestoState.error && (
          <p className="text-sm text-red-600 mt-2">{presupuestoState.error}</p>
        )}

        {/* Form precio final */}
        {mostrarPrecioFinal && (
          <form
            action={entregadoAction}
            className="mt-3 pt-3 border-t flex gap-2"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <input
              type="number"
              name="precio_final"
              placeholder="Precio final cobrado $"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              disabled={entregadoPending}
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition disabled:opacity-50"
            >
              {entregadoPending ? "..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarPrecioFinal(false)}
              className="text-gray-400 hover:text-gray-600 px-2"
            >
              ✕
            </button>
          </form>
        )}
        {!entregadoState.ok && entregadoState.error && (
          <p className="text-sm text-red-600 mt-2">{entregadoState.error}</p>
        )}
      </div>

      {/* REPUESTOS */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">
            🔩 Repuestos utilizados
          </h2>
          <button
            type="button"
            onClick={() => setMostrarRepuesto(!mostrarRepuesto)}
            className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition"
          >
            + Agregar
          </button>
        </div>

        {mostrarRepuesto && (
          <form
            action={repuestoAction}
            className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <input
              type="text"
              name="descripcion"
              required
              placeholder="Descripción del repuesto *"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                name="costo"
                placeholder="Costo $"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="number"
                name="precio_cobrado"
                placeholder="Precio cobrado $"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="number"
                name="cantidad"
                placeholder="Cant."
                defaultValue="1"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {!repuestoState.ok && repuestoState.error && (
              <p className="text-sm text-red-600">{repuestoState.error}</p>
            )}
            <button
              type="submit"
              disabled={repuestoPending}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {repuestoPending ? "Guardando..." : "Guardar repuesto"}
            </button>
          </form>
        )}

        {repuestos.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin repuestos cargados.</p>
        ) : (
          <div className="space-y-2">
            {repuestos.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
              >
                <div>
                  <span className="font-medium text-gray-800">
                    {r.descripcion}
                  </span>
                  {r.cantidad > 1 && (
                    <span className="text-gray-400 ml-1">x{r.cantidad}</span>
                  )}
                  <div className="text-xs text-gray-400">
                    Costo: {formatARS(r.costo)} · Cobrado:{" "}
                    {formatARS(r.precio_cobrado)}
                  </div>
                </div>
                <form
                  action={eliminarRepuesto}
                  onSubmit={(e) => {
                    if (!confirm("¿Eliminár este repuesto?"))
                      e.preventDefault();
                  }}
                >
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="repuesto_id" value={r.id} />
                  <button
                    type="submit"
                    className="text-red-400 hover:text-red-600 ml-2"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CAMBIAR ESTADO */}
      <CambiarEstadoForm
        slug={slug}
        equipoId={equipo.id}
        estado={equipo.estado}
      />

      {/* HISTORIAL */}
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold text-gray-700 mb-3">📋 Historial</h2>
        {historial.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin historial.</p>
        ) : (
          <div className="space-y-3">
            {historial.map((h) => {
              const est = ESTADOS.find((e) => e.valor === h.estado_nuevo);
              return (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                    <div className="w-0.5 bg-gray-200 flex-1 mt-1"></div>
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={
                          "text-xs px-2 py-0.5 rounded-full " + est?.color
                        }
                      >
                        {est?.etiqueta}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatFechaHora(h.fecha)}
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
        )}
      </div>
    </div>
  );
}
