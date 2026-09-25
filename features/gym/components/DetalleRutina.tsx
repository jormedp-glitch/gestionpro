// features/gym/components/DetalleRutina.tsx
//
// Detalle de una rutina (R5, client component): cabecera con nombre,
// descripción, sesiones y estado; por cada sesión, sus actividades en el orden
// de `orden` (ejercicio, series × repeticiones, descanso y notas) con su botón
// de quitar, más el formulario para agregar una actividad nueva. Las lecturas
// llegan del Server Component; las escrituras, de las Server Actions (R5).

"use client";

import { useActionState, useState } from "react";
import {
  agregarActividad,
  quitarActividad,
  type GymActionResult,
} from "@/features/gym/actions/rutinas";
import { useAvisoAccion } from "@/features/gym/components/useAvisoAccion";
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { Input } from "@/lib/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/ui/select";
import { toast, Toaster } from "@/lib/ui/toast";
import { cn } from "@/lib/ui/utils";
import type {
  GymActividad,
  GymEjercicio,
  GymRutina,
  GymRutinaSesion,
} from "@/features/gym/data/gym";

/** Detalle de una actividad: series × repeticiones, descanso y notas (R5). */
function detalleActividad(actividad: GymActividad): string {
  const partes: string[] = [];
  const { series, repeticiones, descanso_seg: descanso, notas } = actividad;
  if (series != null && repeticiones)
    partes.push(`${series} × ${repeticiones}`);
  else if (series != null) partes.push(`${series} series`);
  else if (repeticiones) partes.push(repeticiones);
  if (descanso != null) partes.push(`${descanso} s de descanso`);
  if (notas) partes.push(notas);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

/** Botón "🗑️": quita una actividad de la sesión y renumera el orden (R5). */
function QuitarActividadBoton({
  slug,
  actividadId,
  showToast,
}: {
  slug: string;
  actividadId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(quitarActividad, {
    ok: false,
  } as GymActionResult);
  useAvisoAccion(state, showToast, "Actividad quitada ✓");

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("¿Quitar esta actividad?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="actividad_id" value={actividadId} />
      <button
        type="submit"
        disabled={pending}
        title="Quitar actividad"
        aria-label="Quitar actividad"
        className="cursor-pointer rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs text-red-400"
      >
        🗑️
      </button>
    </form>
  );
}

/** Formulario para agregar una actividad a la sesión (R5). */
function AgregarActividadForm({
  slug,
  sesionId,
  ejercicios,
  showToast,
}: {
  slug: string;
  sesionId: string;
  ejercicios: GymEjercicio[];
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(agregarActividad, {
    ok: false,
  } as GymActionResult);
  const [ejercicioId, setEjercicioId] = useState("");
  useAvisoAccion(state, showToast, "Actividad agregada ✓");

  if (ejercicios.length === 0) {
    return (
      <p className="m-0 text-sm text-muted-foreground">
        No hay ejercicios cargados: creá uno en la biblioteca.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="sesion_id" value={sesionId} />
      {/* Radix Select no participa del <form>: el valor viaja en el hidden.
          Los numéricos y las notas son no controlados: React los limpia al
          enviar (reset automático de las form actions, verificado en 19.2). */}
      <input type="hidden" name="ejercicio_id" value={ejercicioId} />
      <Select value={ejercicioId} onValueChange={setEjercicioId}>
        <SelectTrigger>
          <SelectValue placeholder="Elegí un ejercicio" />
        </SelectTrigger>
        <SelectContent>
          {ejercicios.map((ejercicio) => (
            <SelectItem key={ejercicio.id} value={ejercicio.id}>
              {ejercicio.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-3 gap-2">
        <Input
          type="number"
          name="series"
          min={1}
          placeholder="Series"
          aria-label="Series"
        />
        <Input
          name="repeticiones"
          placeholder="Repeticiones"
          aria-label="Repeticiones"
        />
        <Input
          type="number"
          name="descanso_seg"
          min={1}
          placeholder="Descanso (s)"
          aria-label="Descanso en segundos"
        />
      </div>
      <Input name="notas" placeholder="Notas" aria-label="Notas" />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="accent"
          size="sm"
          disabled={pending || !ejercicioId}
          className="rounded-[10px] font-bold"
        >
          {pending ? "Agregando..." : "+ Agregar actividad"}
        </Button>
      </div>
    </form>
  );
}

export function DetalleRutina({
  slug,
  rutina,
  sesiones,
  ejercicios,
}: {
  slug: string;
  rutina: GymRutina;
  sesiones: GymRutinaSesion[];
  ejercicios: GymEjercicio[];
}) {
  const showToast = (msg: string) => toast(msg, { duration: 3000 });

  return (
    <div className="mx-auto max-w-3xl p-4 pb-16">
      <a href={"/" + slug} className="text-sm text-muted-foreground">
        ← Volver
      </a>
      <div className="mb-1 mt-2 flex flex-wrap items-center gap-3">
        <h2 className="m-0 font-serif text-[1.6rem]">🏋️ {rutina.nombre}</h2>
        <Badge
          className={cn(
            "border-transparent",
            rutina.activo
              ? "bg-emerald-400/15 text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {rutina.activo ? "Activa" : "Inactiva"}
        </Badge>
      </div>
      <p className="m-0 text-sm text-muted-foreground">
        {rutina.descripcion ?? "Sin descripción"} · {rutina.sesiones_total}{" "}
        sesiones
      </p>

      {sesiones.map((sesion) => (
        <Card key={sesion.id} className="mt-5 overflow-hidden p-0">
          <h3 className="m-0 px-4 py-3.5 font-serif text-[1.15rem]">
            Sesión {sesion.numero_sesion}
          </h3>
          {sesion.actividades.length === 0 ? (
            <p className="m-0 px-4 pb-3 text-sm text-muted-foreground">
              Sin actividades todavía.
            </p>
          ) : (
            /* En pantallas angostas la fila scrollea en horizontal en vez de
               desbordar la tarjeta. */
            <div className="overflow-x-auto">
              {sesion.actividades.map((actividad) => (
                <div
                  key={actividad.id}
                  className="grid min-w-[520px] grid-cols-[1.3fr_1.5fr_auto] items-center gap-2 border-b border-border/60 px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 truncate text-sm font-medium">
                    {actividad.ejercicio?.nombre ?? "Ejercicio"}
                  </div>
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {detalleActividad(actividad)}
                  </div>
                  <QuitarActividadBoton
                    slug={slug}
                    actividadId={actividad.id}
                    showToast={showToast}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border/60 px-4 py-3.5">
            <AgregarActividadForm
              slug={slug}
              sesionId={sesion.id}
              ejercicios={ejercicios}
              showToast={showToast}
            />
          </div>
        </Card>
      ))}

      <Toaster />
    </div>
  );
}
