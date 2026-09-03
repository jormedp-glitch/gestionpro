// features/turnos/components/NuevoTurnoModal.tsx
//
// Modal de alta de turno (client component). El formulario envía los datos a
// la Server Action `crearTurno` (R9); al confirmarse cierra el modal, avisa
// con toast y abre WhatsApp con el mensaje de confirmación (R3/R4). Mismos
// campos y comportamiento que el modal original del monolito.

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { crearTurno } from "@/features/turnos/actions/turnos";
import type { TurnoActionResult } from "@/features/turnos/actions/turnos";

interface FormularioTurno {
  clienteNombre: string;
  telefono: string;
  servicio: string;
  fecha: string;
  hora: string;
  notas: string;
}

const HORAS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

export function NuevoTurnoModal({
  slug,
  color,
  fechaInicial,
  onClose,
  onToast,
}: {
  slug: string;
  color: string;
  fechaInicial: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(crearTurno, {
    ok: false,
  } as TurnoActionResult);
  const [form, setForm] = useState<FormularioTurno>({
    clienteNombre: "",
    telefono: "",
    servicio: "",
    fecha: fechaInicial,
    hora: "",
    notas: "",
  });
  const manejado = useRef(false);

  function setCampo<K extends keyof FormularioTurno>(
    campo: K,
    valor: FormularioTurno[K],
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
    onToast("Turno creado ✓");
    onClose();
    if (state.waUrl) window.open(state.waUrl, "_blank");
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
          📅 Nuevo Turno
        </h3>
        <form
          action={formAction}
          style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}
        >
          <input type="hidden" name="slug" value={slug} />
          <input
            style={inp}
            placeholder="Nombre del cliente"
            name="cliente_nombre"
            value={form.clienteNombre}
            onChange={(e) => setCampo("clienteNombre", e.target.value)}
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
            placeholder="Servicio"
            name="servicio"
            value={form.servicio}
            onChange={(e) => setCampo("servicio", e.target.value)}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: ".75rem",
            }}
          >
            <input
              style={inp}
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={(e) => setCampo("fecha", e.target.value)}
            />
            <select
              style={inp}
              name="hora"
              value={form.hora}
              onChange={(e) => setCampo("hora", e.target.value)}
            >
              <option value="">Hora</option>
              {HORAS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <input
            style={inp}
            placeholder="Notas (opcional)"
            name="notas"
            value={form.notas}
            onChange={(e) => setCampo("notas", e.target.value)}
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
