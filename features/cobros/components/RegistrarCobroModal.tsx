// features/cobros/components/RegistrarCobroModal.tsx
//
// Modal de registro de cobro (R10, R11; client component). El formulario envía
// los datos a la Server Action `registrarCobro`, que inserta el cobro y
// recalcula el vencimiento del cliente; al confirmarse cierra el modal y avisa
// con toast. Sigue el patrón de NuevoClienteModal/NuevoTurnoModal: primitiva
// Dialog + Select (fase5-ui P6), cero estilos inline (REQ-TT-3) y el error de
// la action siempre visible.

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { registrarCobro } from "@/features/cobros/actions/cobros";
import type { CobroActionResult } from "@/features/cobros/actions/cobros";
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

interface FormularioCobro {
  monto: string;
  concepto: string;
  medioPago: string;
  fecha: string;
}

/** Medios de pago aceptados por la action (R10), en el orden del formulario. */
const MEDIOS_PAGO = [
  "efectivo",
  "transferencia",
  "mercadopago",
  "otro",
] as const;

/** Etiqueta capitalizada del medio de pago para el select (R10). */
function etiquetaMedioPago(medio: string): string {
  return medio.charAt(0).toUpperCase() + medio.slice(1);
}

export function RegistrarCobroModal({
  slug,
  clienteId,
  clienteNombre,
  onClose,
  onToast,
}: {
  slug: string;
  clienteId: string;
  clienteNombre: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(registrarCobro, {
    ok: false,
  } as CobroActionResult);
  const [form, setForm] = useState<FormularioCobro>({
    monto: "",
    concepto: "",
    medioPago: "efectivo",
    fecha: new Date().toISOString().split("T")[0],
  });
  const manejado = useRef(false);

  function setCampo<K extends keyof FormularioCobro>(
    campo: K,
    valor: FormularioCobro[K],
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
    onToast("Cobro registrado ✓");
    onClose();
  }, [state, onToast, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-7">
        <DialogTitle className="font-serif text-[1.3rem]">
          💵 Registrar cobro
        </DialogTitle>
        <p className="m-0 text-sm text-muted-foreground">{clienteNombre}</p>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="medio_pago" value={form.medioPago} />
          <Input
            inputMode="decimal"
            required
            placeholder="Monto"
            name="monto"
            value={form.monto}
            onChange={(e) =>
              setCampo("monto", e.target.value.replace(",", "."))
            }
          />
          <Input
            placeholder="Concepto (ej: cuota mensual)"
            name="concepto"
            value={form.concepto}
            onChange={(e) => setCampo("concepto", e.target.value)}
          />
          <Select
            value={form.medioPago}
            onValueChange={(v) => setCampo("medioPago", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Medio de pago" />
            </SelectTrigger>
            <SelectContent>
              {MEDIOS_PAGO.map((m) => (
                <SelectItem key={m} value={m}>
                  {etiquetaMedioPago(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            name="fecha"
            value={form.fecha}
            onChange={(e) => setCampo("fecha", e.target.value)}
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
