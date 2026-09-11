// features/reparaciones/components/DetalleReparacion.tsx
//
// Detalle de una reparación (client component). Recibe el equipo, historial
// y repuestos ya leídos en el Server Component (R8). Las mutaciones
// (presupuesto, repuestos, entrega, cambio de estado) son Server Actions
// validadas con zod (R9); el estado/select de transiciones sale del mapa del
// dominio (R2) y el WhatsApp de los links wa.me se arma con
// lib/domain/mensajes + wa.ts (R3/R4).
// Migrado a tokens/primitivas (fase5-ui P7): cero clases de paleta cruda
// (text-gray-*, bg-white → tokens), inputs nativos → primitiva Input, estado
// → primitiva Badge. Colores semánticos (verde/amarillo/rojo de estado,
// WhatsApp) se conservan como clases de paleta (sin token en la paleta).

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
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Input } from "@/lib/ui/input";
import { cn } from "@/lib/ui/utils";
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
    <div className="mx-auto max-w-2xl p-4 pb-16">
      {/* ENCABEZADO */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xl text-muted-foreground hover:text-foreground"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-accent">
              {equipo.numero_orden}
            </span>
            <Badge className={cn("border-transparent", estadoInfo?.color)}>
              {estadoInfo?.etiqueta}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {equipo.categoria}
            {equipo.marca ? " · " + equipo.marca : ""}
            {equipo.modelo ? " " + equipo.modelo : ""}
          </p>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="mb-3 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">👤 Cliente</h2>
        <p className="font-medium">
          {equipo.clientes?.nombre || "Sin cliente"}
        </p>
        {equipo.clientes?.telefono && (
          <a
            href={buildWhatsAppLink(equipo.clientes.telefono, "")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            📱 {equipo.clientes.telefono}
          </a>
        )}
      </div>

      {/* EQUIPO */}
      <div className="mb-3 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">💻 Equipo</h2>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <span className="text-muted-foreground">Categoría</span>
          <span>{equipo.categoria}</span>
          {equipo.marca && (
            <>
              <span className="text-muted-foreground">Marca</span>
              <span>{equipo.marca}</span>
            </>
          )}
          {equipo.modelo && (
            <>
              <span className="text-muted-foreground">Modelo</span>
              <span>{equipo.modelo}</span>
            </>
          )}
          {equipo.numero_serie && (
            <>
              <span className="text-muted-foreground">N° Serie</span>
              <span>{equipo.numero_serie}</span>
            </>
          )}
          {equipo.accesorios && (
            <>
              <span className="text-muted-foreground">Accesorios</span>
              <span>{equipo.accesorios}</span>
            </>
          )}
          {equipo.tecnico_asignado && (
            <>
              <span className="text-muted-foreground">Técnico</span>
              <span>{equipo.tecnico_asignado}</span>
            </>
          )}
          <span className="text-muted-foreground">Ingreso</span>
          <span>{formatFechaHora(equipo.fecha_ingreso)}</span>
          {equipo.fecha_estimada_entrega && (
            <>
              <span className="text-muted-foreground">Entrega est.</span>
              <span>{equipo.fecha_estimada_entrega}</span>
            </>
          )}
        </div>
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="mb-1 text-xs text-muted-foreground">
            Problema reportado
          </p>
          <p className="text-sm">{equipo.problema_reportado}</p>
        </div>
        {equipo.observaciones_internas && (
          <div className="mt-2 border-t border-border/60 pt-2">
            <p className="mb-1 text-xs text-muted-foreground">Notas internas</p>
            <p className="text-sm italic text-muted-foreground">
              {equipo.observaciones_internas}
            </p>
          </div>
        )}
      </div>

      {/* PRESUPUESTO Y PRECIO */}
      <div className="mb-3 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">💰 Presupuesto y cobro</h2>
        <div className="flex flex-wrap gap-3">
          {equipo.presupuesto != null && (
            <div className="rounded-lg bg-yellow-50 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Presupuesto</p>
              <p className="font-bold text-yellow-700">
                {formatARS(equipo.presupuesto)}
              </p>
            </div>
          )}
          {totalRepuestos > 0 && (
            <div className="rounded-lg bg-accent/10 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Repuestos</p>
              <p className="font-bold text-accent">
                {formatARS(totalRepuestos)}
              </p>
            </div>
          )}
          {equipo.precio_final != null && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Cobrado</p>
              <p className="font-bold text-green-700">
                {formatARS(equipo.precio_final)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {equipo.presupuesto == null && (
            <button
              type="button"
              onClick={() => setMostrarPresupuesto(!mostrarPresupuesto)}
              className="rounded-lg bg-yellow-100 px-3 py-1.5 text-sm text-yellow-700 transition-colors hover:bg-yellow-200"
            >
              + Cargar presupuesto
            </button>
          )}
          {equipo.estado === "listo_para_retirar" &&
            equipo.precio_final == null && (
              <button
                type="button"
                onClick={() => setMostrarPrecioFinal(!mostrarPrecioFinal)}
                className="rounded-lg bg-green-100 px-3 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-200"
              >
                ✓ Marcar entregado y cobrado
              </button>
            )}
        </div>

        {/* Form presupuesto */}
        {mostrarPresupuesto && (
          <form
            action={presupuestoAction}
            className="mt-3 flex gap-2 border-t border-border/60 pt-3"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <Input
              type="number"
              name="monto"
              placeholder="Monto $"
              className="flex-1"
            />
            <button
              type="submit"
              disabled={presupuestoPending}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-600 disabled:opacity-50"
            >
              {presupuestoPending ? "..." : "Enviar por WA"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarPresupuesto(false)}
              className="px-2 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </form>
        )}
        {!presupuestoState.ok && presupuestoState.error && (
          <p className="mt-2 text-sm text-red-400">{presupuestoState.error}</p>
        )}

        {/* Form precio final */}
        {mostrarPrecioFinal && (
          <form
            action={entregadoAction}
            className="mt-3 flex gap-2 border-t border-border/60 pt-3"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <Input
              type="number"
              name="precio_final"
              placeholder="Precio final cobrado $"
              className="flex-1"
            />
            <button
              type="submit"
              disabled={entregadoPending}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              {entregadoPending ? "..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarPrecioFinal(false)}
              className="px-2 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </form>
        )}
        {!entregadoState.ok && entregadoState.error && (
          <p className="mt-2 text-sm text-red-400">{entregadoState.error}</p>
        )}
      </div>

      {/* REPUESTOS */}
      <div className="mb-3 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">🔩 Repuestos utilizados</h2>
          <button
            type="button"
            onClick={() => setMostrarRepuesto(!mostrarRepuesto)}
            className="rounded-lg bg-accent/15 px-3 py-1 text-sm text-accent transition-colors hover:bg-accent/25"
          >
            + Agregar
          </button>
        </div>

        {mostrarRepuesto && (
          <form
            action={repuestoAction}
            className="mb-3 space-y-2 rounded-lg bg-muted/40 p-3"
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="equipo_id" value={equipo.id} />
            <Input
              type="text"
              name="descripcion"
              required
              placeholder="Descripción del repuesto *"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" name="costo" placeholder="Costo $" />
              <Input
                type="number"
                name="precio_cobrado"
                placeholder="Precio cobrado $"
              />
              <Input
                type="number"
                name="cantidad"
                placeholder="Cant."
                defaultValue="1"
              />
            </div>
            {!repuestoState.ok && repuestoState.error && (
              <p className="text-sm text-red-400">{repuestoState.error}</p>
            )}
            <Button
              type="submit"
              disabled={repuestoPending}
              variant="accent"
              className="h-auto w-full rounded-lg py-2 text-sm"
            >
              {repuestoPending ? "Guardando..." : "Guardar repuesto"}
            </Button>
          </form>
        )}

        {repuestos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin repuestos cargados.
          </p>
        ) : (
          <div className="space-y-2">
            {repuestos.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-b border-border/60 pb-2 text-sm last:border-0"
              >
                <div>
                  <span className="font-medium">{r.descripcion}</span>
                  {r.cantidad > 1 && (
                    <span className="ml-1 text-muted-foreground">
                      x{r.cantidad}
                    </span>
                  )}
                  <div className="text-xs text-muted-foreground">
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
                    className="ml-2 text-red-400 hover:text-red-600"
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
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">📋 Historial</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin historial.</p>
        ) : (
          <div className="space-y-3">
            {historial.map((h) => {
              const est = ESTADOS.find((e) => e.valor === h.estado_nuevo);
              return (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"></div>
                    <div className="mt-1 w-0.5 flex-1 bg-border/60"></div>
                  </div>
                  <div className="flex-1 pb-3">
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
        )}
      </div>
    </div>
  );
}
