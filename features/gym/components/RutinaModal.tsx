// features/gym/components/RutinaModal.tsx
//
// Modal de alta y edición de una rutina (R5, client component). El formulario
// envía los datos a la Server Action `crearRutina` (alta, con la cantidad de
// sesiones) o `actualizarRutina` (edición, solo nombre y descripción); al
// confirmarse cierra el modal y avisa con toast. Las sesiones de una rutina
// existente se ajustan desde el detalle de la rutina, por eso en edición el
// campo queda deshabilitado.

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  actualizarRutina,
  crearRutina,
  type GymActionResult,
} from "@/features/gym/actions/rutinas";
import { Button } from "@/lib/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/lib/ui/dialog";
import { Input } from "@/lib/ui/input";
import type { GymRutina } from "@/features/gym/data/gym";

interface FormularioRutina {
  nombre: string;
  descripcion: string;
  sesiones_total: string;
}

export function RutinaModal({
  slug,
  rutina,
  onClose,
  onToast,
}: {
  slug: string;
  rutina?: GymRutina | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const esEdicion = Boolean(rutina);
  const [state, formAction, pending] = useActionState(
    esEdicion ? actualizarRutina : crearRutina,
    { ok: false } as GymActionResult,
  );
  const [form, setForm] = useState<FormularioRutina>(() => ({
    nombre: rutina?.nombre ?? "",
    descripcion: rutina?.descripcion ?? "",
    // Alta: arranca en el mínimo (1) para no caer en el error genérico del
    // server con el campo vacío; edición: valor actual (campo deshabilitado).
    sesiones_total: rutina ? String(rutina.sesiones_total) : "1",
  }));
  const manejado = useRef(false);

  function setCampo<K extends keyof FormularioRutina>(
    campo: K,
    valor: FormularioRutina[K],
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
    onToast(esEdicion ? "Rutina actualizada ✓" : "Rutina creada ✓");
    onClose();
  }, [state, esEdicion, onToast, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-7">
        <DialogTitle className="font-serif text-[1.3rem]">
          {esEdicion ? "Editar rutina" : "+ Nueva rutina"}
        </DialogTitle>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          {esEdicion && rutina && (
            <input type="hidden" name="rutina_id" value={rutina.id} />
          )}
          <Input
            placeholder="Nombre"
            name="nombre"
            required
            value={form.nombre}
            onChange={(e) => setCampo("nombre", e.target.value)}
          />
          <Input
            placeholder="Descripción"
            name="descripcion"
            value={form.descripcion}
            onChange={(e) => setCampo("descripcion", e.target.value)}
          />
          <Input
            type="number"
            name="sesiones_total"
            min={1}
            max={52}
            required={!esEdicion}
            disabled={esEdicion}
            value={form.sesiones_total}
            onChange={(e) => setCampo("sesiones_total", e.target.value)}
          />
          {esEdicion && (
            <p className="m-0 text-sm text-muted-foreground">
              Las sesiones se ajustan desde el detalle de la rutina.
            </p>
          )}

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
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
