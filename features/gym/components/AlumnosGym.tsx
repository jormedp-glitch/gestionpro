// features/gym/components/AlumnosGym.tsx
//
// Listado de alumnos del rubro gimnasio (R2, R3, R7, client component).
// Recibe los alumnos y el progreso del negocio ya leídos en el Server
// Component; el IMC de cada fila se calcula con el dominio puro
// (lib/domain/imc) a partir de la última medición del alumno. Las escrituras
// pasan por Server Actions (R9): el alta y la edición por `AlumnoModal`, la
// regeneración del acceso al portal por `RegenerarCodigoBoton` y la baja por
// `EliminarAlumnoBoton`.

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  eliminarAlumno,
  regenerarCodigoAcceso,
  type GymActionResult,
} from "@/features/gym/actions/alumnos";
import { AlumnoModal } from "@/features/gym/components/AlumnoModal";
import { categoriaImc, imc, type CategoriaImc } from "@/lib/domain/imc";
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import { cn } from "@/lib/ui/utils";
import type { GymAlumno, GymProgresoResumen } from "@/features/gym/data/gym";

/** Etiqueta en español de la categoría OMS del IMC (R7). */
const ETIQUETA_CATEGORIA: Record<CategoriaImc, string> = {
  bajo: "Bajo",
  normal: "Normal",
  sobrepeso: "Sobrepeso",
  obesidad: "Obesidad",
};

/** Categoría OMS → color token (bajo/sobrepeso ámbar, normal verde, obesidad rojo). */
function claseColorImc(categoria: CategoriaImc): string {
  if (categoria === "normal") return "text-emerald-400";
  if (categoria === "obesidad") return "text-red-400";
  return "text-amber-400";
}

function claseFondoImc(categoria: CategoriaImc): string {
  if (categoria === "normal") return "bg-emerald-400/15";
  if (categoria === "obesidad") return "bg-red-400/15";
  return "bg-amber-400/15";
}

/** Contacto visible de la fila: teléfono (WhatsApp), email o "—" sin datos. */
function contactoDe(alumno: GymAlumno): string {
  if (alumno.cliente?.telefono) return `📱 ${alumno.cliente.telefono}`;
  return alumno.cliente?.email ?? "—";
}

/** Botón "🔑 Código": regenera el `portal_token` vía Server Action (R3). */
function RegenerarCodigoBoton({
  slug,
  clienteId,
  showToast,
}: {
  slug: string;
  clienteId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(regenerarCodigoAcceso, {
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
    showToast("Código regenerado ✓");
  }, [state, showToast]);

  // Un fallo de la action no puede quedar invisible (defecto de la
  // validación): se avisa una vez por resultado nuevo, aunque el error se
  // repita entre intentos.
  useEffect(() => {
    if (!state.error || errorAvisado.current === state) return;
    errorAvisado.current = state;
    showToast(state.error);
  }, [state, showToast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs"
      >
        🔑 Código
      </button>
    </form>
  );
}

/** Botón "🗑️": da de baja al alumno y sus datos vía Server Action (R2). */
function EliminarAlumnoBoton({
  slug,
  clienteId,
  showToast,
}: {
  slug: string;
  clienteId: string;
  showToast: (msg: string) => void;
}) {
  const [state, formAction, pending] = useActionState(eliminarAlumno, {
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
    showToast("Alumno eliminado ✓");
  }, [state, showToast]);

  // Un fallo de la baja no puede quedar invisible (defecto de la validación):
  // se avisa una vez por resultado nuevo, aunque el error se repita.
  useEffect(() => {
    if (!state.error || errorAvisado.current === state) return;
    errorAvisado.current = state;
    showToast(state.error);
  }, [state, showToast]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Eliminar el alumno? Se borran su ficha, rutinas asignadas, progreso y cobros.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cliente_id" value={clienteId} />
      <button
        type="submit"
        disabled={pending}
        title="Eliminar alumno"
        aria-label="Eliminar alumno"
        className="cursor-pointer rounded-lg border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-xs text-red-400"
      >
        🗑️
      </button>
    </form>
  );
}

/** Chip con el prefijo del `portal_token` (R3): lo copia al portapapeles sin
    exponer el token completo en pantalla. */
function CopiarCodigoBoton({
  portalToken,
  showToast,
}: {
  portalToken: string;
  showToast: (msg: string) => void;
}) {
  const copiar = async () => {
    // `navigator.clipboard` no existe en contextos no seguros: se chequea
    // explícitamente y, igual, la llamada queda dentro del try/catch.
    if (!navigator.clipboard) {
      showToast("No se pudo copiar el código.");
      return;
    }
    try {
      await navigator.clipboard.writeText(portalToken);
      showToast("Código copiado ✓");
    } catch {
      showToast("No se pudo copiar el código.");
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar el código del portal"
      aria-label="Copiar el código del portal"
      className="cursor-pointer rounded-lg border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs"
    >
      {portalToken.slice(0, 8)}…
    </button>
  );
}

export function AlumnosGym({
  slug,
  alumnos,
  progreso,
  showToast,
}: {
  slug: string;
  alumnos: GymAlumno[];
  progreso: GymProgresoResumen[];
  showToast: (msg: string) => void;
}) {
  const [modal, setModal] = useState<null | "alta" | "edicion">(null);
  const [seleccionado, setSeleccionado] = useState<GymAlumno | null>(null);

  /** Último peso por alumno en una sola pasada: `progreso` ya viene por fecha
      desc, así que la primera aparición de cada cliente es la más reciente. */
  const ultimoPesoPorCliente = progreso.reduce((mapa, p) => {
    if (!mapa.has(p.cliente_id)) mapa.set(p.cliente_id, p.peso);
    return mapa;
  }, new Map<string, number>());

  function ultimoPesoDe(clienteId: string): number | null {
    return ultimoPesoPorCliente.get(clienteId) ?? null;
  }

  const abrirAlta = () => {
    setSeleccionado(null);
    setModal("alta");
  };

  const abrirEdicion = (alumno: GymAlumno) => {
    setSeleccionado(alumno);
    setModal("edicion");
  };

  const cerrarModal = () => {
    setModal(null);
    setSeleccionado(null);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-[1.6rem]">🏋️ Alumnos</h2>
        <Button
          variant="accent"
          onClick={abrirAlta}
          className="rounded-[10px] font-bold"
        >
          + Agregar
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        {alumnos.length === 0 && (
          <EmptyState
            title="Sin alumnos todavía"
            action={
              <Button variant="accent" onClick={abrirAlta}>
                + Agregar alumno
              </Button>
            }
          />
        )}
        {/* En pantallas angostas la fila scrollea en horizontal en vez de
            desbordar la tarjeta. */}
        <div className="overflow-x-auto">
          {alumnos.map((alumno) => {
            const peso = ultimoPesoDe(alumno.cliente_id);
            const valorImc =
              peso != null && alumno.altura_cm != null
                ? imc(peso, alumno.altura_cm)
                : null;
            const categoria = valorImc != null ? categoriaImc(valorImc) : null;
            return (
              <div
                key={alumno.cliente_id}
                className="grid min-w-[680px] grid-cols-[1fr_1fr_1fr_auto_auto_auto] items-center gap-2 border-b border-border/60 px-4 py-3.5"
              >
                <div className="min-w-0 truncate text-sm font-medium">
                  {alumno.cliente?.nombre ?? "Sin nombre"}
                </div>
                <div className="min-w-0 truncate text-xs text-muted-foreground">
                  {contactoDe(alumno)}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {alumno.objetivo ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {alumno.altura_cm != null ? `${alumno.altura_cm} cm` : "—"}
                </div>
                <div>
                  {valorImc != null && categoria != null ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">
                        IMC {valorImc}
                      </span>
                      <Badge
                        className={cn(
                          "border-transparent",
                          claseFondoImc(categoria),
                          claseColorImc(categoria),
                        )}
                      >
                        {ETIQUETA_CATEGORIA[categoria]}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      IMC pendiente
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirEdicion(alumno)}
                    title="Editar alumno"
                    aria-label="Editar alumno"
                    className="cursor-pointer rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs"
                  >
                    ✏️
                  </button>
                  <RegenerarCodigoBoton
                    slug={slug}
                    clienteId={alumno.cliente_id}
                    showToast={showToast}
                  />
                  <CopiarCodigoBoton
                    portalToken={alumno.portal_token}
                    showToast={showToast}
                  />
                  <EliminarAlumnoBoton
                    slug={slug}
                    clienteId={alumno.cliente_id}
                    showToast={showToast}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {modal === "alta" && (
        <AlumnoModal slug={slug} onClose={cerrarModal} onToast={showToast} />
      )}

      {modal === "edicion" && seleccionado && (
        <AlumnoModal
          slug={slug}
          alumno={seleccionado}
          ultimoPesoKg={ultimoPesoDe(seleccionado.cliente_id)}
          onClose={cerrarModal}
          onToast={showToast}
        />
      )}
    </div>
  );
}
