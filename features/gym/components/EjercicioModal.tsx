// features/gym/components/EjercicioModal.tsx
//
// Modal de alta y edición de un ejercicio propio del negocio (R4, client
// component). El formulario envía los datos a la Server Action
// `crearEjercicio` (alta) o `actualizarEjercicio` (edición); al confirmarse
// cierra el modal y avisa con toast. El catálogo global (`negocio_id` null) es
// de solo lectura (AD-3/D3): este modal solo se abre para ejercicios propios.

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  actualizarEjercicio,
  crearEjercicio,
  type GymActionResult,
} from "@/features/gym/actions/ejercicios";
import { Button } from "@/lib/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/lib/ui/dialog";
import { Input } from "@/lib/ui/input";
import type { GymEjercicio } from "@/features/gym/data/gym";

interface FormularioEjercicio {
  nombre: string;
  grupo_muscular: string;
  descripcion: string;
  url_video: string;
}

export function EjercicioModal({
  slug,
  ejercicio,
  onClose,
  onToast,
}: {
  slug: string;
  ejercicio?: GymEjercicio | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const esEdicion = Boolean(ejercicio);
  const [state, formAction, pending] = useActionState(
    esEdicion ? actualizarEjercicio : crearEjercicio,
    { ok: false } as GymActionResult,
  );
  const [form, setForm] = useState<FormularioEjercicio>(() => ({
    nombre: ejercicio?.nombre ?? "",
    grupo_muscular: ejercicio?.grupo_muscular ?? "",
    descripcion: ejercicio?.descripcion ?? "",
    url_video: ejercicio?.url_video ?? "",
  }));
  const manejado = useRef(false);

  function setCampo<K extends keyof FormularioEjercicio>(
    campo: K,
    valor: FormularioEjercicio[K],
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
    onToast(esEdicion ? "Ejercicio actualizado ✓" : "Ejercicio agregado ✓");
    onClose();
  }, [state, esEdicion, onToast, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-7">
        <DialogTitle className="font-serif text-[1.3rem]">
          {esEdicion ? "Editar ejercicio" : "+ Nuevo ejercicio"}
        </DialogTitle>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          {esEdicion && ejercicio && (
            <input type="hidden" name="ejercicio_id" value={ejercicio.id} />
          )}
          <Input
            placeholder="Nombre"
            name="nombre"
            required
            value={form.nombre}
            onChange={(e) => setCampo("nombre", e.target.value)}
          />
          <Input
            placeholder="Grupo muscular (ej: pecho)"
            name="grupo_muscular"
            value={form.grupo_muscular}
            onChange={(e) => setCampo("grupo_muscular", e.target.value)}
          />
          <Input
            placeholder="Descripción"
            name="descripcion"
            value={form.descripcion}
            onChange={(e) => setCampo("descripcion", e.target.value)}
          />
          <Input
            placeholder="URL del video"
            name="url_video"
            value={form.url_video}
            onChange={(e) => setCampo("url_video", e.target.value)}
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
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
