// app/global-error.tsx
//
// Fallback mínimo para errores fuera de los boundaries de segmento
// (REQ-FS-1, escenario "Error global"). Reemplaza al layout raíz, por lo
// que DEBE definir <html>/<body> propios (docs locales error-handling.md).
// Client Component; sin metadata/generateMetadata (no soportadas aquí).

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // global-error debe incluir html y body (contrato Next 16).
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center text-foreground">
        <h1 className="text-2xl font-semibold">Error inesperado</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          La aplicación no pudo cargar correctamente. Inténtalo de nuevo.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
