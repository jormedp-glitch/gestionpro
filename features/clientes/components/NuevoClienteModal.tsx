// features/clientes/components/NuevoClienteModal.tsx
//
// Modal de alta de cliente (client component). El formulario envía los datos
// a la Server Action `agregarCliente` (R9); al confirmarse cierra el modal y
// avisa con toast. Mismos campos y comportamiento que el modal original del
// monolito. Migrado a la primitiva Dialog (fase5-ui P6): focus trap + ESC +
// aria-modal de fábrica (REQ-UP-2); cierre por overlay/ESC via onOpenChange;
// cero estilos inline (REQ-TT-3); el color por prop se eliminó (tokens).

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { agregarCliente } from "@/features/clientes/actions/clientes";
import type { ClienteActionResult } from "@/features/clientes/actions/clientes";
import { Button } from "@/lib/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/lib/ui/dialog";
import { Input } from "@/lib/ui/input";

interface FormularioCliente {
  nombre: string;
  telefono: string;
  plan: string;
  cuota: string;
  vence: string;
}

export function NuevoClienteModal({
  slug,
  onClose,
  onToast,
}: {
  slug: string;
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-7">
        <DialogTitle className="font-serif text-[1.3rem]">
          + Nuevo Cliente
        </DialogTitle>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          <Input
            placeholder="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={(e) => setCampo("nombre", e.target.value)}
          />
          <Input
            placeholder="Teléfono (WhatsApp)"
            name="telefono"
            value={form.telefono}
            onChange={(e) => setCampo("telefono", e.target.value)}
          />
          <Input
            placeholder="Plan (ej: Musculación, Corte, etc.)"
            name="plan"
            value={form.plan}
            onChange={(e) => setCampo("plan", e.target.value)}
          />
          <Input
            type="number"
            placeholder="Cuota mensual ($)"
            name="cuota"
            value={form.cuota}
            onChange={(e) => setCampo("cuota", e.target.value)}
          />
          <Input
            type="date"
            name="vence"
            value={form.vence}
            onChange={(e) => setCampo("vence", e.target.value)}
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
