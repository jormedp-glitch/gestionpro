// features/gym/components/RutinasGym.tsx
//
// Listado de rutinas del negocio (R5, client component). Recibe las rutinas ya
// leídas en el Server Component; el alta y la edición pasan por `RutinaModal`
// y la baja por `EliminarRutinaBoton` (Server Actions, R9). El nombre de cada
// rutina enlaza a su detalle (`/[slug]/gym/rutinas/[id]`).

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  eliminarRutina,
  type GymActionResult,
} from "@/features/gym/actions/rutinas";
import { RutinaModal } from "@/features/gym/components/RutinaModal";
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import { cn } from "@/lib/ui/utils";
import type { GymRutina } from "@/features/gym/data/gym";

/** Botón "🗑️": da de baja una rutina vía Server Action (R5). */
function EliminarRutinaBoton({
  slug,
  rutinaId,
  showToast,
}: {
  slug: string;
  rutinaId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(eliminarRutina, {
    ok: false,
  } as GymActionResult);
  const manejado = useRef(false);
  const errorAvisado = useRef<GymActionResult | null>(null);

  useEffect(() => {
    if (!state.ok) {
      manejado.current = false;
      return;
    }
    if (manejado.current) return;
    manejado.current = true;
    showToast("Rutina eliminada ✓");
  }, [state, showToast]);

  // Un fallo de la baja no puede quedar invisible: el backend rechaza borrar
  // una rutina asignada a un alumno (FK restrict) y el mensaje se muestra.
  useEffect(() => {
    if (!state.error || errorAvisado.current === state) return;
    errorAvisado.current = state;
    showToast(state.error);
  }, [state, showToast]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar la rutina?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rutina_id" value={rutinaId} />
      <button
        type="submit"
        disabled={pending}
        title="Eliminar rutina"
        aria-label="Eliminar rutina"
        className="cursor-pointer rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs text-red-400"
      >
        🗑️
      </button>
    </form>
  );
}

export function RutinasGym({
  slug,
  rutinas,
  showToast,
}: {
  slug: string;
  rutinas: GymRutina[];
  showToast: (msg: string) => void;
}) {
  const [modal, setModal] = useState<null | "alta" | "edicion">(null);
  const [seleccionada, setSeleccionada] = useState<GymRutina | null>(null);

  const abrirAlta = () => {
    setSeleccionada(null);
    setModal("alta");
  };

  const abrirEdicion = (rutina: GymRutina) => {
    setSeleccionada(rutina);
    setModal("edicion");
  };

  const cerrarModal = () => {
    setModal(null);
    setSeleccionada(null);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-[1.6rem]">🏋️ Rutinas</h2>
        <Button
          variant="accent"
          onClick={abrirAlta}
          className="rounded-[10px] font-bold"
        >
          + Nueva rutina
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        {rutinas.length === 0 && (
          <EmptyState
            title="Sin rutinas todavía"
            description="Creá una rutina y después asignale sus ejercicios."
            action={
              <Button variant="accent" onClick={abrirAlta}>
                + Nueva rutina
              </Button>
            }
          />
        )}
        {/* En pantallas angostas la fila scrollea en horizontal en vez de
            desbordar la tarjeta. */}
        <div className="overflow-x-auto">
          {rutinas.map((rutina) => (
            <div
              key={rutina.id}
              className="grid min-w-[640px] grid-cols-[1.2fr_1.6fr_auto_auto_auto] items-center gap-2 border-b border-border/60 px-4 py-3.5"
            >
              <div className="min-w-0 truncate text-sm font-medium">
                {/* R5: el detalle de la rutina es una ruta real enlazable. */}
                <a
                  href={"/" + slug + "/gym/rutinas/" + rutina.id}
                  title="Ver detalle"
                  className="hover:text-accent"
                >
                  {rutina.nombre}
                </a>
              </div>
              <div className="min-w-0 truncate text-xs text-muted-foreground">
                {rutina.descripcion ?? "—"}
              </div>
              <div className="whitespace-nowrap text-xs text-accent">
                {rutina.sesiones_total} sesiones
              </div>
              <div>
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
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => abrirEdicion(rutina)}
                  title="Editar rutina"
                  aria-label="Editar rutina"
                  className="cursor-pointer rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs"
                >
                  ✏️
                </button>
                <EliminarRutinaBoton
                  slug={slug}
                  rutinaId={rutina.id}
                  showToast={showToast}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {modal === "alta" && (
        <RutinaModal slug={slug} onClose={cerrarModal} onToast={showToast} />
      )}

      {modal === "edicion" && seleccionada && (
        <RutinaModal
          slug={slug}
          rutina={seleccionada}
          onClose={cerrarModal}
          onToast={showToast}
        />
      )}
    </div>
  );
}
