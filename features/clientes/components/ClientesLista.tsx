// features/clientes/components/ClientesLista.tsx
//
// Listado de clientes (client component). Recibe los clientes ya leídos en el
// Server Component (R8). Las escrituras (pagar/eliminar) pasan por Server
// Actions (R9); el WhatsApp de cobro usa `mensajeCobro` (variante canónica
// A6) con el builder del dominio (R4).

"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import {
  eliminarCliente,
  pagarCliente,
} from "@/features/clientes/actions/clientes";
import type { ClienteActionResult } from "@/features/clientes/actions/clientes";
import { mensajeCobro } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { formatARS, formatFecha } from "@/lib/domain/formato";
import type { Cliente } from "@/features/clientes/data/clientes";

function etiquetaEstado(estado: string) {
  if (estado === "activo") return "Activo";
  if (estado === "vence_pronto") return "Vence pronto";
  return "Vencido";
}

function colorEstado(estado: string) {
  if (estado === "activo") return "#34D399";
  if (estado === "vence_pronto") return "#FBBF24";
  return "#F87171";
}

function fondoEstado(estado: string) {
  if (estado === "activo") return "#34D39920";
  if (estado === "vence_pronto") return "#FBBF2420";
  return "#F8717120";
}

/** Botón "✓ Pagó": registra el pago vía Server Action y avisa con toast. */
function PagarClienteBoton({
  slug,
  clienteId,
  showToast,
}: {
  slug: string;
  clienteId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(pagarCliente, {
    ok: false,
  } as ClienteActionResult);
  const manejado = useRef(false);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast("Pagado ✓");
  }, [state, showToast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      <button
        type="submit"
        style={{
          background: "#34D39915",
          color: "#34D399",
          border: "1px solid #34D39930",
          borderRadius: "8px",
          padding: ".3rem .55rem",
          cursor: "pointer",
          fontSize: ".72rem",
          fontFamily: "sans-serif",
        }}
      >
        ✓ Pagó
      </button>
    </form>
  );
}

/** Botón "✕": elimina el cliente vía Server Action y avisa con toast. */
function EliminarClienteBoton({
  slug,
  clienteId,
  showToast,
}: {
  slug: string;
  clienteId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(eliminarCliente, {
    ok: false,
  } as ClienteActionResult);
  const manejado = useRef(false);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast("Eliminado");
  }, [state, showToast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      <button
        type="submit"
        style={{
          background: "#F8717115",
          color: "#F87171",
          border: "none",
          borderRadius: "8px",
          padding: ".3rem .5rem",
          cursor: "pointer",
          fontSize: ".72rem",
          fontFamily: "sans-serif",
        }}
      >
        ✕
      </button>
    </form>
  );
}

export function ClientesLista({
  slug,
  clientes,
  negocioNombre,
  color,
  icon,
  onNuevoCliente,
  showToast,
}: {
  slug: string;
  clientes: Cliente[];
  negocioNombre: string;
  color: string;
  icon: string;
  onNuevoCliente: () => void;
  showToast: (msg: string) => void;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <h2 style={{ fontFamily: "serif", fontSize: "1.6rem" }}>
          {icon} Clientes
        </h2>
        <button
          onClick={onNuevoCliente}
          style={{
            background: color,
            color: "#000",
            border: "none",
            borderRadius: "10px",
            padding: ".6rem 1.2rem",
            cursor: "pointer",
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          + Agregar
        </button>
      </div>
      <div
        style={{
          background: "#ffffff06",
          border: "1px solid #ffffff0C",
          borderRadius: "16px",
          padding: "0",
          overflow: "hidden",
        }}
      >
        {clientes.map((c) => {
          const telefono = c.telefono;
          return (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto auto auto auto",
                gap: ".5rem",
                alignItems: "center",
                padding: ".85rem 1rem",
                borderBottom: "1px solid #ffffff07",
              }}
            >
              <div>
                <div style={{ fontSize: ".88rem", fontWeight: 500 }}>
                  {c.nombre}
                </div>
                {telefono && (
                  <div style={{ fontSize: ".72rem", color: "#444" }}>
                    📱 {telefono}
                  </div>
                )}
              </div>
              <div style={{ fontSize: ".82rem", color: "#888" }}>{c.plan}</div>
              <div style={{ color, fontWeight: 700, fontSize: ".88rem" }}>
                {formatARS(c.cuota)}
              </div>
              <div style={{ fontSize: ".78rem", color: "#666" }}>
                {formatFecha(c.vence || "")}
              </div>
              <span
                style={{
                  background: fondoEstado(c.estado),
                  color: colorEstado(c.estado),
                  padding: ".2rem .6rem",
                  borderRadius: "999px",
                  fontSize: ".72rem",
                  fontWeight: 600,
                }}
              >
                {etiquetaEstado(c.estado)}
              </span>
              <div style={{ display: "flex", gap: ".35rem" }}>
                {c.estado !== "activo" && (
                  <PagarClienteBoton
                    slug={slug}
                    clienteId={c.id}
                    showToast={showToast}
                  />
                )}
                {telefono && (
                  <button
                    onClick={() =>
                      window.open(
                        buildWhatsAppLink(
                          telefono,
                          mensajeCobro(negocioNombre, c.nombre),
                        ),
                        "_blank",
                      )
                    }
                    style={{
                      background: "#25D36615",
                      color: "#25D366",
                      border: "1px solid #25D36630",
                      borderRadius: "8px",
                      padding: ".3rem .55rem",
                      cursor: "pointer",
                      fontSize: ".72rem",
                      fontFamily: "sans-serif",
                    }}
                  >
                    📲
                  </button>
                )}
                <EliminarClienteBoton
                  slug={slug}
                  clienteId={c.id}
                  showToast={showToast}
                />
              </div>
            </div>
          );
        })}
        {clientes.length === 0 && (
          <p
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#444",
            }}
          >
            Sin clientes todavía
          </p>
        )}
      </div>
    </div>
  );
}
