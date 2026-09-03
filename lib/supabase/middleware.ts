import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Shared client for the root proxy.ts (Next 16 — middleware.ts is deprecated).
 * Reads cookies from the raw Cookie header, refreshes the session via
 * getUser() and returns the response that carries any refreshed cookies.
 */
export async function getClaims(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser(): session
  // refresh relies on this being the first auth call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, supabaseResponse, user };
}
