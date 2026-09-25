// lib/domain/rutas-publicas.ts
//
// Decisión PURA de ruta pública del gate optimista (proxy.ts): sin sesión solo
// pasan /login, el seguimiento público, el portal del alumno y los favicons
// por negocio (branding). El enforcement real vive en el DAL + RLS (fase 1) y,
// en el portal, en los RPC security definer (R15).

/**
 * true si `pathname` debe ser alcanzable SIN sesión:
 *  - `/login` (login);
 *  - `/[slug]/seguimiento/[orden]` (token por query, D-11);
 *  - `/[slug]/portal/[token]` (token = capacidad, AD-2/R13);
 *  - `/[slug]/icon` (favicon público por negocio, discovery #197).
 */
export function esRutaPublica(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return (
    pathname === "/login" ||
    (segments.length >= 3 &&
      (segments[1] === "seguimiento" || segments[1] === "portal")) ||
    (segments.length >= 2 && segments[segments.length - 1] === "icon")
  );
}
