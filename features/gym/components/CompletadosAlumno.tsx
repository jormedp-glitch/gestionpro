// features/gym/components/CompletadosAlumno.tsx
//
// Historial de días entrenados del alumno (R8, client component de solo
// lectura). El profe ve qué días entrenó el alumno y qué actividades completó;
// marcar y desmarcar es acción del alumno en el portal (unidad posterior), así
// que acá no hay botones. Los completados llegan por fecha desc y se agrupan
// por día; los nombres se resuelven contra las actividades de la rutina activa
// y, si un ejercicio ya no está en la rutina, cae a un fallback atenuado.

"use client";

import { formatFecha } from "@/lib/domain/formato";
import type { GymActividad, GymCompletado } from "@/features/gym/data/gym";

/** Máximo de nombres de actividad visibles por día antes de "+n más" (R8). */
const MAX_NOMBRES = 4;

export function CompletadosAlumno({
  completados,
  actividades,
}: {
  completados: GymCompletado[];
  actividades: GymActividad[];
}) {
  // Índice actividad → nombre del ejercicio embebido; `null` cuando el id ya
  // no pertenece a la rutina activa (o la actividad no trae ejercicio).
  const nombrePorActividad = new Map(
    actividades.map((actividad) => [
      actividad.id,
      actividad.ejercicio?.nombre ?? null,
    ]),
  );

  // R8: se agrupa por fecha preservando el orden de llegada (fecha desc): el
  // Map conserva la inserción, así el día más reciente queda primero.
  const porFecha = new Map<string, GymCompletado[]>();
  for (const completado of completados) {
    const fila = porFecha.get(completado.fecha);
    if (fila) fila.push(completado);
    else porFecha.set(completado.fecha, [completado]);
  }

  if (completados.length === 0) {
    return (
      <p className="m-0 text-xs text-muted-foreground">
        Sin días entrenados registrados
      </p>
    );
  }

  return (
    <div>
      {[...porFecha.entries()].map(([fecha, fila]) => {
        const visibles = fila.slice(0, MAX_NOMBRES);
        const restantes = fila.length - visibles.length;
        return (
          <div
            key={fecha}
            className="border-b border-border/60 py-2 text-xs last:border-b-0"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{formatFecha(fecha)}</span>
              <span className="text-muted-foreground">
                {fila.length === 1
                  ? "1 actividad"
                  : `${fila.length} actividades`}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {visibles.map((completado) => {
                const nombre = nombrePorActividad.get(
                  completado.rutina_ejercicio_id,
                );
                return (
                  <span
                    key={completado.id}
                    className={
                      nombre
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                    }
                  >
                    {nombre ?? "Actividad"}
                  </span>
                );
              })}
              {restantes > 0 && (
                <span className="text-muted-foreground">+{restantes} más</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
