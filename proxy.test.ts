// proxy.test.ts
//
// Focused test of the optimistic gate's public-path decision (proxy.ts →
// esRutaPublica). Business favicons (/[slug]/icon...) are public branding
// (discovery #197, fix in P5 addendum) and the student portal
// (/[slug]/portal/[token], token = capability) must be reachable without a
// session too. Every other route stays protected.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockGetClaims } = vi.hoisted(() => ({ mockGetClaims: vi.fn() }));

vi.mock("@/lib/supabase/middleware", () => ({
  getClaims: mockGetClaims,
}));

import { proxy } from "./proxy";

function req(path: string): NextRequest {
  return new NextRequest("https://gestionpro.test" + path);
}

function anon() {
  return {
    supabase: null,
    supabaseResponse: new NextResponse(null, { status: 200 }),
    user: null,
  };
}

describe("proxy: public and protected paths", () => {
  beforeEach(() => {
    mockGetClaims.mockReset();
    mockGetClaims.mockResolvedValue(anon());
  });

  it("allows /login without a session", async () => {
    const res = await proxy(req("/login"));
    expect(res.status).toBe(200);
  });

  it("allows /[slug]/seguimiento/[orden] without a session", async () => {
    const res = await proxy(req("/taller-x/seguimiento/1234"));
    expect(res.status).toBe(200);
  });

  it("allows /[slug]/portal/[token] without a session", async () => {
    const res = await proxy(
      req("/taller-x/portal/3f2504e0-4f89-41d3-9a0c-0305e82c3301"),
    );
    expect(res.status).toBe(200);
  });

  it("still protects /[slug]/portal without a token (redirect to /login)", async () => {
    const res = await proxy(req("/taller-x/portal"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows the public business favicon /[slug]/icon without a session", async () => {
    const res = await proxy(req("/taller-x/icon"));
    expect(res.status).toBe(200);
  });

  it("allows the favicon with its cache-busting query string", async () => {
    const res = await proxy(req("/taller-x/icon?d93c6d7e2d1b6729"));
    expect(res.status).toBe(200);
  });

  it("still protects /[slug] without a session (redirect to /login)", async () => {
    const res = await proxy(req("/taller-x"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("still protects other private paths without a session", async () => {
    const res = await proxy(req("/taller-x/reparaciones"));
    expect(res.status).toBe(307);
  });

  it("redirects an authenticated user away from /login", async () => {
    mockGetClaims.mockResolvedValue({
      supabase: null,
      supabaseResponse: new NextResponse(null, { status: 200 }),
      user: { id: "u1" },
    });
    const res = await proxy(req("/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://gestionpro.test/");
  });
});
