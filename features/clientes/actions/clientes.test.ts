// features/clientes/actions/clientes.test.ts
//
// Tests de `pagarCliente` (issue #177): además de extender el vencimiento
// (issue #78), el pago de la cuota registra un cobro real en `cobros` para
// que Caja/Dashboard sumen plata cobrada. Mismo patrón de mocks que
// features/cobros/actions/cobros.test.ts (query builder fluido de supabase,
// lib/server/negocio y next/cache) y tiempo congelado para que "hoy" sea
// determinista.
//
// El cobro es no bloqueante: si falla, el pago (vence/estado) ya quedó firme.
// Sin cuota (> 0) no se inserta nada.

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
import { pagarCliente } from "./clientes";

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

describe("pagarCliente (issue #177)", () => {
  it("extiende el vence e inserta el cobro con monto = cuota y concepto Cuota <plan>", async () => {
    db.encolar("clientes", {
      data: { vence: "2026-08-01", cuota: 15000, plan: "Premium" },
      error: null,
    });
    db.encolar("clientes", { data: null, error: null });
    db.encolar("cobros", { data: null, error: null });

    const result = await pagarCliente(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1" }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("clientes")[1].update).toHaveBeenCalledWith({
      estado: "activo",
      vence: "2026-10-25",
    });
    expect(db.consultas("cobros")[0].insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      cliente_id: "cliente-1",
      monto: 15000,
      concepto: "Cuota Premium",
      medio_pago: "efectivo",
      fecha: "2026-09-25",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it.each([0, null])(
    "con cuota %j: extiende el vence pero NO inserta cobro",
    async (cuota) => {
      db.encolar("clientes", {
        data: { vence: "2026-08-01", cuota, plan: "Básico" },
        error: null,
      });
      db.encolar("clientes", { data: null, error: null });

      const result = await pagarCliente(
        { ok: false },
        fd({ slug: "gym-test", cliente_id: "cliente-1" }),
      );

      expect(result).toEqual({ ok: true });
      expect(db.consultas("clientes")[1].update).toHaveBeenCalledWith({
        estado: "activo",
        vence: "2026-10-25",
      });
      expect(db.consultas("cobros")).toHaveLength(0);
    },
  );
});
