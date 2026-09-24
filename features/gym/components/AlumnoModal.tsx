// features/gym/components/AlumnoModal.tsx
//
// Modal de alta y edición de la ficha del alumno (R2, R3, R7, client
// component). El formulario envía los datos a la Server Action `agregarAlumno`
// (alta) o `actualizarAlumno` (edición); al confirmarse cierra el modal y avisa
// con toast. La vista previa del IMC usa el dominio puro (lib/domain/imc) con
// el último peso medido (`ultimoPesoKg`): en esta unidad todavía no hay carga
// de progreso en la UI.

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  actualizarAlumno,
  agregarAlumno,
  type GymActionResult,
} from "@/features/gym/actions/alumnos";
import { categoriaImc, imc, type CategoriaImc } from "@/lib/domain/imc";
import { Button } from "@/lib/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/lib/ui/dialog";
import { Input } from "@/lib/ui/input";
import type { GymAlumno } from "@/features/gym/data/gym";

interface FormularioAlumno {
  nombre: string;
  telefono: string;
  email: string;
  objetivo: string;
  notas: string;
  altura_cm: string;
  fecha_nac: string;
}

/** Etiqueta en español de la categoría OMS del IMC (R7). */
const ETIQUETA_CATEGORIA: Record<CategoriaImc, string> = {
  bajo: "Bajo",
  normal: "Normal",
  sobrepeso: "Sobrepeso",
  obesidad: "Obesidad",
};

export function AlumnoModal({
  slug,
  alumno,
  ultimoPesoKg,
  onClose,
  onToast,
}: {
  slug: string;
  alumno?: GymAlumno | null;
  ultimoPesoKg?: number | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const esEdicion = Boolean(alumno);
  const [state, formAction, pending] = useActionState(
    esEdicion ? actualizarAlumno : agregarAlumno,
    { ok: false } as GymActionResult,
  );
  const [form, setForm] = useState<FormularioAlumno>(() => ({
    nombre: alumno?.cliente?.nombre ?? "",
    telefono: alumno?.cliente?.telefono ?? "",
    email: alumno?.cliente?.email ?? "",
    objetivo: alumno?.objetivo ?? "",
    notas: alumno?.notas ?? "",
    altura_cm: alumno?.altura_cm != null ? String(alumno.altura_cm) : "",
    fecha_nac: alumno?.fecha_nac ?? "",
  }));
  const manejado = useRef(false);

  function setCampo<K extends keyof FormularioAlumno>(
    campo: K,
    valor: FormularioAlumno[K],
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
    onToast(esEdicion ? "Alumno actualizado ✓" : "Alumno agregado ✓");
    onClose();
  }, [state, esEdicion, onToast, onClose]);

  // Vista previa (R7): sin peso medido no hay IMC; `imc()` además descarta
  // alturas vacías o no positivas (Number("") = 0).
  const valorImc =
    ultimoPesoKg != null ? imc(ultimoPesoKg, Number(form.altura_cm)) : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-7">
        <DialogTitle className="font-serif text-[1.3rem]">
          {esEdicion ? "Editar Alumno" : "+ Nuevo Alumno"}
        </DialogTitle>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          {esEdicion && alumno && (
            <input type="hidden" name="cliente_id" value={alumno.cliente_id} />
          )}
          <Input
            placeholder="Nombre"
            name="nombre"
            required
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
            placeholder="Email"
            name="email"
            value={form.email}
            onChange={(e) => setCampo("email", e.target.value)}
          />
          <Input
            placeholder="Objetivo (ej: bajar de peso)"
            name="objetivo"
            value={form.objetivo}
            onChange={(e) => setCampo("objetivo", e.target.value)}
          />
          <Input
            placeholder="Notas"
            name="notas"
            value={form.notas}
            onChange={(e) => setCampo("notas", e.target.value)}
          />
          <Input
            placeholder="Altura (cm)"
            name="altura_cm"
            inputMode="decimal"
            value={form.altura_cm}
            // Teclados móviles ofrecen coma decimal: se normaliza a punto para
            // no romper la vista previa del IMC ni la validación del server.
            onChange={(e) =>
              setCampo("altura_cm", e.target.value.replace(",", "."))
            }
          />
          <Input
            type="date"
            name="fecha_nac"
            value={form.fecha_nac}
            onChange={(e) => setCampo("fecha_nac", e.target.value)}
          />

          <p className="m-0 text-sm text-muted-foreground">
            {valorImc != null
              ? `IMC ${valorImc} · ${ETIQUETA_CATEGORIA[categoriaImc(valorImc)]}`
              : "IMC pendiente (sin mediciones)"}
          </p>

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
