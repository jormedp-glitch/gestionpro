// app/not-found.tsx
//
// 404 global (REQ-FS-1, escenario "404"): URL inexistente → navegación al
// inicio. Server Component; el root app/not-found también cubre URLs sin
// ruta (docs locales not-found.md). Español neutro.

import Link from "next/link";
import { buttonVariants } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La página que buscas no existe o fue movida.
      </p>
      <Link href="/" className={buttonVariants({ variant: "accent" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
