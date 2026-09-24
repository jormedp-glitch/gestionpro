// features/gym/components/BibliotecaEjercicios.tsx
//
// Biblioteca de ejercicios del negocio (R4, client component). Recibe el
// catálogo ya leído en el Server Component: los ejercicios propios se pueden
// editar y eliminar; el catálogo global compartido (`negocio_id` null) es de
// solo lectura (AD-3/D3) y se marca con un Badge "Global". Las escrituras
// pasan por Server Actions (R9) vía `EjercicioModal` y `EliminarEjercicioBoton`.

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  eliminarEjercicio,
  type GymActionResult,
} from "@/features/gym/actions/ejercicios";
import { EjercicioModal } from "@/features/gym/components/EjercicioModal";
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import type { GymEjercicio } from "@/features/gym/data/gym";

/** Botón "🗑️": da de baja un ejercicio propio vía Server Action (R4). */
function EliminarEjercicioBoton({
  slug,
  ejercicioId,
  showToast,
}: {
  slug: string;
  ejercicioId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(eliminarEjercicio, {
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
    showToast("Ejercicio eliminado ✓");
  }, [state, showToast]);

  // Un fallo de la baja no puede quedar invisible: se avisa una vez por
  // resultado nuevo, aunque el error se repita entre intentos.
  useEffect(() => {
    if (!state.error || errorAvisado.current === state) return;
    errorAvisado.current = state;
    showToast(state.error);
  }, [state, showToast]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("¿Eliminar el ejercicio?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="ejercicio_id" value={ejercicioId} />
      <button
        type="submit"
        disabled={pending}
        title="Eliminar ejercicio"
        aria-label="Eliminar ejercicio"
        className="cursor-pointer rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs text-red-400"
      >
        🗑️
      </button>
    </form>
  );
}

export function BibliotecaEjercicios({
  slug,
  ejercicios,
  showToast,
}: {
  slug: string;
  ejercicios: GymEjercicio[];
  showToast: (msg: string) => void;
}) {
  const [modal, setModal] = useState<null | "alta" | "edicion">(null);
  const [seleccionado, setSeleccionado] = useState<GymEjercicio | null>(null);

  const abrirAlta = () => {
    setSeleccionado(null);
    setModal("alta");
  };

  const abrirEdicion = (ejercicio: GymEjercicio) => {
    setSeleccionado(ejercicio);
    setModal("edicion");
  };

  const cerrarModal = () => {
    setModal(null);
    setSeleccionado(null);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-[1.6rem]">📚 Biblioteca</h2>
        <Button
          variant="accent"
          onClick={abrirAlta}
          className="rounded-[10px] font-bold"
        >
          + Nuevo ejercicio
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        {/* El vacío es del listado completo: con ejercicios globales (AD-3)
            la tabla se muestra igual y no hay hint de alta. */}
        {ejercicios.length === 0 && (
          <EmptyState
            title="Sin ejercicios todavía"
            description="Cargá tu primer ejercicio o sumá los del catálogo global."
            action={
              <Button variant="accent" onClick={abrirAlta}>
                + Nuevo ejercicio
              </Button>
            }
          />
        )}
        {/* En pantallas angostas la fila scrollea en horizontal en vez de
            desbordar la tarjeta. */}
        <div className="overflow-x-auto">
          {ejercicios.map((ejercicio) => {
            // AD-3/D3: `negocio_id` null = catálogo global de solo lectura.
            const esGlobal = ejercicio.negocio_id === null;
            return (
              <div
                key={ejercicio.id}
                className="grid min-w-[720px] grid-cols-[1.1fr_0.9fr_1.6fr_auto_auto] items-center gap-2 border-b border-border/60 px-4 py-3.5"
              >
                <div className="min-w-0 truncate text-sm font-medium">
                  {ejercicio.nombre}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {ejercicio.grupo_muscular ?? "—"}
                </div>
                <div className="min-w-0 truncate text-xs text-muted-foreground">
                  {ejercicio.descripcion ?? "—"}
                </div>
                <div>
                  {ejercicio.url_video && (
                    <a
                      href={ejercicio.url_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent no-underline hover:underline"
                    >
                      ▶ Video
                    </a>
                  )}
                </div>
                <div className="flex justify-end gap-1.5">
                  {esGlobal ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Global
                    </Badge>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => abrirEdicion(ejercicio)}
                        title="Editar ejercicio"
                        aria-label="Editar ejercicio"
                        className="cursor-pointer rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs"
                      >
                        ✏️
                      </button>
                      <EliminarEjercicioBoton
                        slug={slug}
                        ejercicioId={ejercicio.id}
                        showToast={showToast}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {modal === "alta" && (
        <EjercicioModal slug={slug} onClose={cerrarModal} onToast={showToast} />
      )}

      {modal === "edicion" && seleccionado && (
        <EjercicioModal
          slug={slug}
          ejercicio={seleccionado}
          onClose={cerrarModal}
          onToast={showToast}
        />
      )}
    </div>
  );
}
