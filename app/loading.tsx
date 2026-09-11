// app/loading.tsx
//
// Estado de carga global del framework (REQ-FS-1): feedback en español
// neutro, nunca pantalla en blanco. Se muestra mientras el segmento raíz
// suspende (streaming). Server Component, sin "use client".

import { Skeleton } from "@/lib/ui";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Skeleton className="h-8 w-48" />
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
