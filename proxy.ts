import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClaims } from "@/lib/supabase/middleware";

/**
 * Optimistic route gate (Next 16 proxy.ts — middleware.ts is deprecated).
 * Real enforcement happens in the DAL + RLS (fase 1, WU-2+).
 * Public: /login, /[slug]/seguimiento/[orden]. Protected: everything else.
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

  const segments = pathname.split("/").filter(Boolean);
  const isPublicPath =
    pathname === "/login" ||
    (segments.length >= 3 && segments[1] === "seguimiento");

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
