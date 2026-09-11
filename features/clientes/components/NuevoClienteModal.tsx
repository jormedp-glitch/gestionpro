// features/clientes/components/NuevoClienteModal.tsx
//
// Modal de alta de cliente (client component). El formulario envía los datos
// a la Server Action `agregarCliente` (R9); al confirmarse cierra el modal y
// avisa con toast. Mismos campos y comportamiento que el modal original del
// monolito.

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { agregarCliente } from "@/features/clientes/actions/clientes";
import type { ClienteActionResult } from "@/features/clientes/actions/clientes";

interface FormularioCliente {
  nombre: string;
  telefono: string;
  plan: string;
  cuota: string;
  vence: string;
}

export function NuevoClienteModal({
  slug,
  color,
  onClose,
  onToast,
}: {
  slug: string;
  color: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(agregarCliente, {
    ok: false,
  } as ClienteActionResult);
  const [form, setForm] = useState<FormularioCliente>({
    nombre: "",
    telefono: "",
    plan: "",
    cuota: "",
    vence: "",
  });
  const manejado = useRef(false);

  function setCampo<K extends keyof FormularioCliente>(
    campo: K,
    valor: FormularioCliente[K],
  ) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    onToast("Cliente agregado ✓");
    onClose();
  }, [state, onToast, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000AA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#13131A",
          border: "1px solid #ffffff12",
          borderRadius: "22px",
          padding: "1.75rem",
          width: "100%",
          maxWidth: "480px",
        }}
      >
        <h3
          style={{
            fontFamily: "serif",
            fontSize: "1.3rem",
            marginBottom: "1.25rem",
          }}
        >
          + Nuevo Cliente
        </h3>
        <form
          action={formAction}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: ".75rem",
          }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input
            style={inp}
            placeholder="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={(e) => setCampo("nombre", e.target.value)}
          />
          <input
            style={inp}
            placeholder="Teléfono (WhatsApp)"
            name="telefono"
            value={form.telefono}
            onChange={(e) => setCampo("telefono", e.target.value)}
          />
          <input
            style={inp}
            placeholder="Plan (ej: Musculación, Corte, etc.)"
            name="plan"
            value={form.plan}
            onChange={(e) => setCampo("plan", e.target.value)}
          />
          <input
            style={inp}
            type="number"
            placeholder="Cuota mensual ($)"
            name="cuota"
            value={form.cuota}
            onChange={(e) => setCampo("cuota", e.target.value)}
          />
          <input
            style={inp}
            type="date"
            name="vence"
            value={form.vence}
            onChange={(e) => setCampo("vence", e.target.value)}
          />

          {!state.ok && state.error && (
            <p
              style={{
                color: "#F87171",
                fontSize: ".82rem",
                margin: 0,
              }}
            >
              {state.error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: ".75rem",
              marginTop: "1.25rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #ffffff18",
                color: "#888",
                borderRadius: "10px",
                padding: ".6rem 1.1rem",
                cursor: "pointer",
                fontFamily: "sans-serif",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              style={{
                background: color,
                color: "#000",
                border: "none",
                borderRadius: "10px",
                padding: ".6rem 1.5rem",
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: "sans-serif",
              }}
            >
              {pending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
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
