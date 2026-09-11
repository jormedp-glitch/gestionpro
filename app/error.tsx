// app/error.tsx
//
// Error boundary raíz (REQ-FS-1, escenario "Error recuperable"): mensaje en
// español neutro + botón de reintento. Client Component (los error
// boundaries deben serlo). En Next 16.2.2 el reintento se expone como
// `unstable_retry` (docs locales error.md, v16.2.0).

"use client";

import { useEffect } from "react";
import { Button } from "@/lib/ui";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Registro para el servicio de errores (digest matchea logs server).
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Ocurrió un error inesperado. Inténtalo de nuevo en un momento.
      </p>
      <Button variant="accent" onClick={() => unstable_retry()}>
        Reintentar
      </Button>
    </div>
  );
}
