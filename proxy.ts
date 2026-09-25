import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClaims } from "@/lib/supabase/middleware";
import { esRutaPublica } from "@/lib/domain/rutas-publicas";

/**
 * Optimistic route gate (Next 16 proxy.ts — middleware.ts is deprecated).
 * Real enforcement happens in the DAL + RLS (fase 1, WU-2+).
 * Public: /login, /[slug]/seguimiento/[orden], /[slug]/portal/[token] y los
 * favicons por negocio (branding público, discovery #197); la decisión vive en
 * `esRutaPublica` (lib/domain/rutas-publicas). Protected: everything else.
 */
function carryCookies(
  target: NextResponse,
  source: NextResponse,
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { supabaseResponse, user } = await getClaims(request);

  const isPublicPath = esRutaPublica(pathname);

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return carryCookies(NextResponse.redirect(loginUrl), supabaseResponse);
  }

  if (user && pathname === "/login") {
    return carryCookies(
      NextResponse.redirect(new URL("/", request.url)),
      supabaseResponse,
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
};
