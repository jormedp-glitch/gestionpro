// features/turnos/actions/turnos.test.ts
//
// Tests de la Server Action de turnos (issue #179 · aviso optativo): el waUrl
// de confirmación solo se arma si hay teléfono Y el checkbox `avisar` vino
// marcado. Sin DB real, sin red: se mockean lib/supabase/server (query builder
// fluido, ver lib/testing/supabase-query-mock), lib/server/negocio y
// next/cache, igual que features/cobros/actions/cobros.test.ts.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { mockFrom, mockRequireNegocio, mockRevalidatePath } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRequireNegocio: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

vi.mock("@/lib/server/negocio", () => ({
  requireNegocio: mockRequireNegocio,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import {
  prepararMockSupabase,
  type SupabaseMock,
} from "@/lib/testing/supabase-query-mock";
import { crearTurno } from "./turnos";

const NEGOCIO = {
  id: "negocio-1",
  nombre: "Taller Test",
  slug: "taller-test",
  rubro: "servicio_tecnico",
  created_at: "2026-01-01T00:00:00Z",
};

/** FormData con las entradas dadas (helper del patrón del repo). */
function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

/** Datos base del turno; cada test agrega/omite teléfono y avisar. */
const TURNO_BASE = {
  slug: "taller-test",
  cliente_nombre: "Retiro de máquinas",
  servicio: "Retiro a domicilio",
  fecha: "2026-09-28",
  hora: "09:00",
};

let db: SupabaseMock;

beforeEach(() => {
  vi.clearAllMocks();
  db = prepararMockSupabase(mockFrom);
  mockRequireNegocio.mockResolvedValue(NEGOCIO);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("crearTurno (#179 · aviso optativo)", () => {
  it("con teléfono y avisar=on: devuelve el waUrl con el teléfono normalizado", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await crearTurno(
      { ok: false },
      fd({
        ...TURNO_BASE,
        telefono: "11 5555-1234",
        avisar: "on",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.waUrl).toContain("https://wa.me/541155551234?text=");
    expect(db.consultas("turnos")[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        negocio_id: "negocio-1",
        telefono: "11 5555-1234",
        estado: "confirmado",
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/taller-test");
  });

  it("con teléfono pero sin avisar: guarda el turno sin waUrl", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await crearTurno(
      { ok: false },
      fd({
        ...TURNO_BASE,
        telefono: "11 5555-1234",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.waUrl).toBeUndefined();
    expect(db.consultas("turnos")[0].insert).toHaveBeenCalled();
  });

  it("sin teléfono: no devuelve waUrl aunque avisar venga marcado", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await crearTurno(
      { ok: false },
      fd({
        ...TURNO_BASE,
        avisar: "on",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.waUrl).toBeUndefined();
    expect(db.consultas("turnos")[0].insert).toHaveBeenCalled();
  });
});
