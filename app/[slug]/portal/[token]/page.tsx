// app/[slug]/portal/[token]/page.tsx
//
// Portal PÚBLICO del alumno (R13–R15, escenario 11) — Server Component
// standalone: sin shell y sin sesión. El token de la URL es la capacidad
// (AD-2) y [slug] es solo informativo (mismo criterio que el seguimiento
// público). Solo se llama al RPC `obtener_portal_alumno` con el cliente
// server (rol anon): la página NO lee tablas ni usa el cliente browser (R15).
// Token con formato inválido o desconocido → el MISMO estado neutral "no
// disponible", sin distinguir un caso del otro (sin oráculo).

import { createClient } from "@/lib/supabase/server";
import {
  esTokenUuid,
  type PortalAlumno as PortalAlumnoData,
} from "@/features/portal/contrato";
import { PortalAlumno } from "@/features/portal/components/PortalAlumno";
import { EmptyState } from "@/lib/ui/empty-state";

/** Estado neutral: mismo render para token inválido y para token desconocido. */
function NoDisponible() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <EmptyState
        className="w-full max-w-sm"
        title="🔗 Link no disponible"
        description="Este link no es válido o ya no está disponible. Pedile uno nuevo a tu profe."
      />
    </div>
  );
}

export default async function PortalAlumnoPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { token } = await params;

  // Formato inválido: se evita el viaje a la base y se responde lo mismo que
  // ante un token desconocido.
  if (!esTokenUuid(token)) return <NoDisponible />;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obtener_portal_alumno", {
    p_token: token,
  });
  if (error) console.error("[portal] obtener_portal_alumno:", error.message);

  const portal = data as PortalAlumnoData | null;
  if (!portal) return <NoDisponible />;

  // Fecha "hoy" del server (UTC, patrón sistémico del repo): se calcula acá y
  // viaja como prop para que el HTML y la hidratación coincidan.
  const hoy = new Date().toISOString().split("T")[0];

  return <PortalAlumno hoy={hoy} portal={portal} />;
}
