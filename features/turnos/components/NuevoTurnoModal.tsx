// features/turnos/components/NuevoTurnoModal.tsx
//
// Modal de alta de turno (client component). El formulario envía los datos a
// la Server Action `crearTurno` (R9); al confirmarse cierra el modal, avisa
// con toast y abre WhatsApp con el mensaje de confirmación (R3/R4). Mismos
// campos y comportamiento que el modal original del monolito. Migrado a la
// primitiva Dialog + Select (fase5-ui P6): focus trap + ESC + aria-modal de
// fábrica (REQ-UP-2); cierre por overlay/ESC via onOpenChange; hora con la
// primitiva Select (teclado, REQ-UP-2); cero estilos inline (REQ-TT-3); el
// color por prop se eliminó (tokens).
//
// #179: el aviso por WhatsApp es optativo y arranca según el rubro
// (lib/domain/rubros): en servicio técnico viene apagado porque el turno
// suele ser un compromiso interno. Sin teléfono el checkbox queda
// deshabilitado y no se envía.
//
// #190: el mismo modal sirve para editar. Con la prop `turno` arranca con los
// datos del turno, guarda con actualizarTurno (turno_id oculto) y avisa si
// fecha+hora se superponen con otro turno del negocio (no bloqueante).

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { actualizarTurno, crearTurno } from "@/features/turnos/actions/turnos";
import type { TurnoActionResult } from "@/features/turnos/actions/turnos";
import type { Turno } from "@/features/turnos/data/turnos";
import { avisoTurnoPorDefecto } from "@/lib/domain/rubros";
import { Button } from "@/lib/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/lib/ui/dialog";
import { Input } from "@/lib/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/ui/select";

interface FormularioTurno {
  clienteNombre: string;
  telefono: string;
  servicio: string;
  fecha: string;
  hora: string;
  notas: string;
  avisar: boolean;
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
  rubro,
  fechaInicial,
  valoresIniciales,
  turno,
  turnosExistentes,
  onClose,
  onToast,
}: {
  slug: string;
  rubro: string;
  fechaInicial: string;
  // Prefill opcional (#180): agendar desde una reparación trae cliente,
  // teléfono, servicio y notas ya armados desde el equipo.
  valoresIniciales?: Partial<{
    clienteNombre: string;
    telefono: string;
    servicio: string;
    notas: string;
  }>;
  // Edición (#190): con el turno el modal arranca con sus datos y guarda con
  // actualizarTurno en vez de crear uno nuevo.
  turno?: Turno;
  // Turnos del negocio (fecha + hora) para el aviso de superposición.
  turnosExistentes?: Array<{ id: string; fecha: string; hora: string }>;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  // Reglas de hooks: los dos useActionState se llaman siempre y el modo elige
  // cuál alimenta al form (el otro queda inerte, sin condicionar el orden).
  const [stateCrear, actionCrear, pendingCrear] = useActionState(crearTurno, {
    ok: false,
  } as TurnoActionResult);
  const [stateEditar, actionEditar, pendingEditar] = useActionState(
    actualizarTurno,
    { ok: false } as TurnoActionResult,
  );
  const editando = turno != null;
  const state = editando ? stateEditar : stateCrear;
  const formAction = editando ? actionEditar : actionCrear;
  const pending = editando ? pendingEditar : pendingCrear;

  const [form, setForm] = useState<FormularioTurno>({
    clienteNombre:
      turno?.cliente_nombre ?? valoresIniciales?.clienteNombre ?? "",
    telefono: turno?.telefono ?? valoresIniciales?.telefono ?? "",
    servicio: turno?.servicio ?? valoresIniciales?.servicio ?? "",
    fecha: turno?.fecha ?? fechaInicial,
    hora: turno?.hora ?? "",
    notas: turno?.notas ?? valoresIniciales?.notas ?? "",
    // Default por rubro: en servicio técnico el turno no se notifica.
    avisar: avisoTurnoPorDefecto(rubro),
  });
  const manejado = useRef(false);

  // Aviso no bloqueante (#190): ya hay otro turno a la misma fecha y hora.
  // En edición el turno se excluye a sí mismo para no alertar siempre.
  const superpuesto = (turnosExistentes ?? []).some(
    (t) => t.id !== turno?.id && t.fecha === form.fecha && t.hora === form.hora,
  );

  // Sin teléfono no hay a quién avisar: el checkbox queda deshabilitado.
  const telefonoCargado = form.telefono.trim() !== "";

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
    onToast(editando ? "Turno actualizado ✓" : "Turno creado ✓");
    onClose();
    if (state.waUrl) window.open(state.waUrl, "_blank");
  }, [state, editando, onToast, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-7">
        <DialogTitle className="font-serif text-[1.3rem]">
          {editando ? "✏️ Editar turno" : "📅 Nuevo Turno"}
        </DialogTitle>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="hora" value={form.hora} />
          {turno && (
            <>
              <input type="hidden" name="turno_id" value={turno.id} />
              {/* El form no expone duración: viaja oculta para conservar la
                  del turno original en vez de resetearla al default. */}
              <input
                type="hidden"
                name="duracion"
                value={turno.duracion ?? 60}
              />
            </>
          )}
          <Input
            placeholder="Cliente o tarea"
            name="cliente_nombre"
            value={form.clienteNombre}
            onChange={(e) => setCampo("clienteNombre", e.target.value)}
          />
          <Input
            placeholder="Teléfono (opcional — con teléfono podés avisarle)"
            name="telefono"
            value={form.telefono}
            onChange={(e) => setCampo("telefono", e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            <input
              type="checkbox"
              name="avisar"
              checked={form.avisar && telefonoCargado}
              disabled={!telefonoCargado}
              onChange={(e) => setCampo("avisar", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Avisar al cliente por WhatsApp
          </label>
          <Input
            placeholder="Servicio"
            name="servicio"
            value={form.servicio}
            onChange={(e) => setCampo("servicio", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={(e) => setCampo("fecha", e.target.value)}
            />
            <Select
              value={form.hora}
              onValueChange={(v) => setCampo("hora", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hora" />
              </SelectTrigger>
              <SelectContent>
                {HORAS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {superpuesto && (
            <p className="m-0 text-sm text-amber-400">
              ⚠️ Ya tenés un turno a esa hora
            </p>
          )}
          <Input
            placeholder="Notas (opcional)"
            name="notas"
            value={form.notas}
            onChange={(e) => setCampo("notas", e.target.value)}
          />

          {!state.ok && state.error && (
            <p className="m-0 text-sm text-red-400">{state.error}</p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-[10px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={pending}
              className="rounded-[10px] font-bold"
            >
              {pending
                ? "Guardando..."
                : editando
                  ? "Guardar cambios"
                  : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
