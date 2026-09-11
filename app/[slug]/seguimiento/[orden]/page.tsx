// app/[slug]/seguimiento/[orden]/page.tsx
//
// Seguimiento PÚBLICO de una reparación (R11): [orden] es solo informativo,
// el acceso lo otorga el token (?token=..., D-11). El contenido vive en
// features/seguimiento/components/SeguimientoContenido (useSearchParams
// dentro de Suspense — patrón requerido por Next para prerender estático).
// No se tocan migraciones ni el allowlist del RPC.

import { Suspense } from "react";
import {
  CargandoReparacion,
  SeguimientoContenido,
} from "@/features/seguimiento/components/SeguimientoContenido";

export default function SeguimientoPage() {
  return (
    <Suspense fallback={<CargandoReparacion />}>
      <SeguimientoContenido />
    </Suspense>
  );
}
