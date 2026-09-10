// app/[slug]/loading.tsx
//
// Carga del segmento [slug] (REQ-FS-1): skeleton segmentado de dashboard
// (header + KPIs + tabla) compuesto con la primitiva Skeleton de lib/ui.
// Server Component, sin "use client".

import { Skeleton } from "@/lib/ui";

export default function SlugLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
