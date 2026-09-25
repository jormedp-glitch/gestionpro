// features/cobros/actions/cobros.test.ts
//
// Tests de la Server Action de cobros (spec R10/R11 · escenario 10: registrar
// un cobro recalcula el vencimiento del cliente con lib/domain/cuotas y lo
// deja en el historial). Sin DB real, sin red: se mockean lib/supabase/server
// (query builder fluido, ver lib/testing/supabase-query-mock) y
// lib/server/negocio; el tiempo se congela para que "hoy" sea determinista.
//
// R11: vence pasado o nulo → hoy + 1 mes; vence futuro → un mes más desde el
// vence (clamp de fin de mes). Si el update del cliente falla se borra el
// cobro recién insertado: cuota e historial no pueden quedar desincronizados.

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
  errorPostgrest,
  prepararMockSupabase,
  type SupabaseMock,
} from "@/lib/testing/supabase-query-mock";
import { registrarCobro } from "./cobros";

const NEGOCIO = {
  id: "negocio-1",
  nombre: "Gym Test",
  slug: "gym-test",
  rubro: "gimnasio",
  created_at: "2026-01-01T00:00:00Z",
};

/** FormData con las entradas dadas (helper del patrón del repo). */
function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

let db: SupabaseMock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ now: new Date("2026-09-25T12:00:00.000Z") });
  db = prepararMockSupabase(mockFrom);
  mockRequireNegocio.mockResolvedValue(NEGOCIO);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("registrarCobro (R10/R11 · escenario 10)", () => {
  it("con vence vencido: inserta el cobro y pasa el vence a hoy + 1 mes", async () => {
    db.encolar("clientes", { data: { vence: "2026-08-01" }, error: null });
    db.encolar("cobros", { data: { id: "cobro-1" }, error: null });
    db.encolar("clientes", { data: null, error: null });

    const result = await registrarCobro(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-1",
        monto: "15000",
        concepto: "Cuota septiembre",
        medio_pago: "transferencia",
        fecha: "2026-09-25",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("cobros")[0].insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      cliente_id: "cliente-1",
      monto: 15000,
      concepto: "Cuota septiembre",
      medio_pago: "transferencia",
      fecha: "2026-09-25",
    });

    const actualizar = db.consultas("clientes")[1];
    expect(actualizar.update).toHaveBeenCalledWith({
      vence: "2026-10-25",
      estado: "activo",
    });
    expect(actualizar.eq).toHaveBeenCalledWith("id", "cliente-1");
    expect(actualizar.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("con vence futuro: extiende un mes desde el vence actual", async () => {
    db.encolar("clientes", { data: { vence: "2026-10-10" }, error: null });
    db.encolar("cobros", { data: { id: "cobro-2" }, error: null });
    db.encolar("clientes", { data: null, error: null });

    await registrarCobro(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-1",
        monto: "15000",
        medio_pago: "efectivo",
        fecha: "2026-09-25",
      }),
    );

    expect(db.consultas("clientes")[1].update).toHaveBeenCalledWith({
      vence: "2026-11-10",
      estado: "activo",
    });
  });

  it("compensa borrando el cobro si falla el update del cliente", async () => {
    db.encolar("clientes", { data: { vence: "2026-08-01" }, error: null });
    db.encolar("cobros", { data: { id: "cobro-1" }, error: null });
    db.encolar("clientes", {
      data: null,
      error: errorPostgrest("boom update"),
    });
    db.encolar("cobros", { data: null, error: null });

    const result = await registrarCobro(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-1",
        monto: "15000",
        medio_pago: "otro",
        fecha: "2026-09-25",
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo registrar el cobro.",
    });
    const compensacion = db.consultas("cobros")[1];
    expect(compensacion.delete).toHaveBeenCalled();
    expect(compensacion.eq).toHaveBeenCalledWith("id", "cobro-1");
    expect(compensacion.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rechaza un cliente de otro negocio sin insertar el cobro", async () => {
    db.encolar("clientes", { data: null, error: null });

    const result = await registrarCobro(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-ajeno",
        monto: "15000",
        medio_pago: "efectivo",
        fecha: "2026-09-25",
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo registrar el cobro.",
    });
    expect(db.consultas("cobros")).toHaveLength(0);
  });

  it("validación zod: medio de pago, monto y fecha inválidos no tocan datos", async () => {
    const medioMalo = await registrarCobro(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-1",
        monto: "15000",
        medio_pago: "bitcoin",
        fecha: "2026-09-25",
      }),
    );
    const montoCero = await registrarCobro(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-1",
        monto: "0",
        medio_pago: "efectivo",
        fecha: "2026-09-25",
      }),
    );
    const sinFecha = await registrarCobro(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-1",
        monto: "15000",
        medio_pago: "efectivo",
        fecha: "",
      }),
    );

    expect(medioMalo).toEqual({ ok: false, error: "Datos inválidos." });
    expect(montoCero).toEqual({ ok: false, error: "Datos inválidos." });
    expect(sinFecha).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockRequireNegocio).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
