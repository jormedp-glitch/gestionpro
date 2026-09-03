// features/gastos/components/GastosCaja.tsx
//
// Caja / gastos (client component). Recibe los gastos ya leídos en el Server
// Component (R8) y los totales del mes calculados en el shell. Las escrituras
// (agregar/eliminar) pasan por Server Actions (R9). Los campos del form son
// uncontrolled: React 19 los resetea solos tras una acción exitosa.

"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { agregarGasto, eliminarGasto } from "@/features/gastos/actions/gastos";
import type { GastoActionResult } from "@/features/gastos/actions/gastos";
import { formatARS, formatFecha } from "@/lib/domain/formato";
import type { Gasto } from "@/features/gastos/data/gastos";

/** Botón "✕": elimina el gasto vía Server Action y avisa con toast. */
function EliminarGastoBoton({
  slug,
  gastoId,
  showToast,
}: {
  slug: string;
  gastoId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(eliminarGasto, {
    ok: false,
  } as GastoActionResult);
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
      <input type="hidden" name="gasto_id" value={gastoId} />
      <button
        type="submit"
        style={{
          background: "#F8717115",
          color: "#F87171",
          border: "none",
          borderRadius: "8px",
          padding: ".25rem .5rem",
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

export function GastosCaja({
  slug,
  gastos,
  ingresoMes,
  gastosMes,
  hoy,
  color,
  showToast,
}: {
  slug: string;
  gastos: Gasto[];
  ingresoMes: number;
  gastosMes: number;
  hoy: string;
  color: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction] = useActionState(agregarGasto, {
    ok: false,
  } as GastoActionResult);
  const manejado = useRef(false);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast("Gasto registrado ✓");
  }, [state, showToast]);

  const neto = ingresoMes - gastosMes;
  const kpis: Array<[string, string, string]> = [
    [formatARS(ingresoMes), "Ingresos", "#34D399"],
    [formatARS(gastosMes), "Gastos", "#F87171"],
    [formatARS(neto), "Neto", neto >= 0 ? "#34D399" : "#F87171"],
  ];

  return (
    <div>
      <h2
        style={{
          fontFamily: "serif",
          fontSize: "1.6rem",
          marginBottom: "1.25rem",
        }}
      >
        💸 Caja
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        {kpis.map(([valor, etiqueta, c], i) => (
          <div
            key={i}
            style={{
              background: "#ffffff06",
              border: "1px solid #ffffff0C",
              borderRadius: "16px",
              padding: "1.25rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: c,
                fontSize: "1.3rem",
                fontWeight: 700,
                fontFamily: "serif",
              }}
            >
              {valor}
            </div>
            <div
              style={{
                color: "#555",
                fontSize: ".75rem",
                marginTop: ".25rem",
              }}
            >
              {etiqueta}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#ffffff06",
          border: "1px solid #ffffff0C",
          borderRadius: "16px",
          padding: "1.4rem",
          marginBottom: "1.25rem",
        }}
      >
        <form
          action={formAction}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 120px auto",
            gap: ".75rem",
            alignItems: "end",
          }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input style={inp} placeholder="Descripción" name="descripcion" />
          <input style={inp} type="number" placeholder="Monto $" name="monto" />
          <input style={inp} type="date" name="fecha" defaultValue={hoy} />
          <button
            type="submit"
            style={{
              background: color,
              color: "#000",
              border: "none",
              borderRadius: "10px",
              padding: ".7rem 1.2rem",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontFamily: "sans-serif",
            }}
          >
            + Agregar
          </button>
        </form>
        {!state.ok && state.error && (
          <p
            style={{
              color: "#F87171",
              fontSize: ".82rem",
              margin: ".75rem 0 0",
            }}
          >
            {state.error}
          </p>
        )}
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
        {gastos.length === 0 && (
          <p
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#444",
            }}
          >
            Sin gastos
          </p>
        )}
        {gastos.map((g) => (
          <div
            key={g.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: ".8rem 1rem",
              borderBottom: "1px solid #ffffff07",
            }}
          >
            <div>
              <div style={{ fontSize: ".88rem" }}>{g.descripcion}</div>
              <div style={{ fontSize: ".72rem", color: "#444" }}>
                {formatFecha(g.fecha || "")}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#F87171", fontWeight: 700 }}>
                - {formatARS(g.monto)}
              </span>
              <EliminarGastoBoton
                slug={slug}
                gastoId={g.id}
                showToast={showToast}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  background: "#ffffff08",
  border: "1px solid #ffffff15",
  color: "#fff",
  borderRadius: "10px",
  padding: ".7rem 1rem",
  fontSize: ".88rem",
  outline: "none",
  fontFamily: "sans-serif",
  width: "100%",
};
