// features/gym/components/RegistrarMedicionModal.tsx
//
// Modal de registro de una medición de progreso (R7, client component). El
// formulario envía los datos a la Server Action `registrarProgreso`; al
// confirmarse cierra el modal y avisa con toast. Los numéricos opcionales
// viajan como string ("" cuando están vacíos) y la action los normaliza y
// valida: el cliente nunca coerciona. Sigue el patrón de AlumnoModal /
// RegistrarCobroModal (Dialog + Input, error de la action siempre visible).

"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  registrarProgreso,
  type GymActionResult,
} from "@/features/gym/actions/asignaciones";
import { Button } from "@/lib/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/lib/ui/dialog";
import { Input } from "@/lib/ui/input";

interface FormularioMedicion {
  fecha: string;
  peso: string;
  cintura: string;
  cadera: string;
  porcentaje_grasa: string;
  pecho_cm: string;
  bicep_cm: string;
  metrica1_nombre: string;
  metrica1_valor: string;
  metrica2_nombre: string;
  metrica2_valor: string;
  notas: string;
}

export function RegistrarMedicionModal({
  slug,
  clienteId,
  onClose,
  onToast,
}: {
  slug: string;
  clienteId: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(registrarProgreso, {
    ok: false,
  } as GymActionResult);
  const [form, setForm] = useState<FormularioMedicion>(() => ({
    fecha: new Date().toISOString().split("T")[0],
    peso: "",
    cintura: "",
    cadera: "",
    porcentaje_grasa: "",
    pecho_cm: "",
    bicep_cm: "",
    metrica1_nombre: "",
    metrica1_valor: "",
    metrica2_nombre: "",
    metrica2_valor: "",
    notas: "",
  }));
  const manejado = useRef(false);

  function setCampo<K extends keyof FormularioMedicion>(
    campo: K,
    valor: FormularioMedicion[K],
  ) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  /** Props de un campo numérico: teclado decimal y coma normalizada a punto. */
  function numerico(campo: keyof FormularioMedicion) {
    return {
      inputMode: "decimal" as const,
      value: form[campo],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setCampo(campo, e.target.value.replace(",", ".")),
    };
  }

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    onToast("Medición registrada ✓");
    onClose();
  }, [state, onToast, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-7">
        <DialogTitle className="font-serif text-[1.3rem]">
          📏 Registrar medición
        </DialogTitle>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="cliente_id" value={clienteId} />
          <Input
            type="date"
            name="fecha"
            value={form.fecha}
            onChange={(e) => setCampo("fecha", e.target.value)}
          />
          <Input
            placeholder="Peso (kg)"
            name="peso"
            required
            {...numerico("peso")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Cintura (cm)"
              name="cintura"
              {...numerico("cintura")}
            />
            <Input
              placeholder="Cadera (cm)"
              name="cadera"
              {...numerico("cadera")}
            />
            <Input
              placeholder="Grasa (%)"
              name="porcentaje_grasa"
              {...numerico("porcentaje_grasa")}
            />
            <Input
              placeholder="Pecho (cm)"
              name="pecho_cm"
              {...numerico("pecho_cm")}
            />
            <Input
              placeholder="Bíceps (cm)"
              name="bicep_cm"
              {...numerico("bicep_cm")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Métrica 1 (nombre)"
              name="metrica1_nombre"
              value={form.metrica1_nombre}
              onChange={(e) => setCampo("metrica1_nombre", e.target.value)}
            />
            <Input
              placeholder="Valor"
              name="metrica1_valor"
              {...numerico("metrica1_valor")}
            />
            <Input
              placeholder="Métrica 2 (nombre)"
              name="metrica2_nombre"
              value={form.metrica2_nombre}
              onChange={(e) => setCampo("metrica2_nombre", e.target.value)}
            />
            <Input
              placeholder="Valor"
              name="metrica2_valor"
              {...numerico("metrica2_valor")}
            />
          </div>
          <Input
            placeholder="Notas"
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
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
