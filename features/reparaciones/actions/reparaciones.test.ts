// features/reparaciones/actions/reparaciones.test.ts
//
// Tests de `marcarEntregado` (issue #177): la entrega cobrada registra un
// cobro real en la tabla `cobros` para que Caja/Dashboard sumen plata
// cobrada, no cuotas proyectadas. Sin DB real, sin red: se mockean
// lib/supabase/server (query builder fluido, ver lib/testing/supabase-query-mock),
// lib/auth/dal (la membresía la resuelve el DAL) y next/cache; el tiempo se
// congela para que "hoy" sea determinista.
//
// Criterio de la acción: la entrega es la operación primaria. Si el insert
// del cobro falla, o si el equipo no tiene cliente (cobros.cliente_id es NOT
// NULL), se loguea y la entrega sigue devolviendo { ok: true }.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { mockFrom, mockRequireMembership, mockRevalidatePath } = vi.hoisted(
  () => ({
    mockFrom: vi.fn(),
    mockRequireMembership: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

vi.mock("@/lib/auth/dal", () => ({
  requireMembership: mockRequireMembership,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import {
  errorPostgrest,
  prepararMockSupabase,
  type SupabaseMock,
} from "@/lib/testing/supabase-query-mock";
import { marcarEntregado } from "./reparaciones";

const NEGOCIO = {
  id: "negocio-1",
  nombre: "Taller Test",
  slug: "taller-test",
  rubro: "reparaciones",
  created_at: "2026-01-01T00:00:00Z",
};

const EQUIPO = {
  id: "equipo-1",
  negocio_id: "negocio-1",
  cliente_id: "cliente-1",
  numero_orden: "0001",
  categoria: "Notebook",
  marca: "Samsung",
  modelo: "Galaxy Book",
  numero_serie: null,
  problema_reportado: "No enciende",
  accesorios: null,
  fecha_ingreso: "2026-09-20T12:00:00Z",
  fecha_estimada_entrega: null,
  estado: "listo_para_retirar",
  tecnico_asignado: null,
  presupuesto: 47000,
  presupuesto_aceptado: null,
  precio_final: null,
  fecha_entrega: null,
  observaciones_internas: null,
  created_at: "2026-09-20T12:00:00Z",
  clientes: { nombre: "Ana", telefono: "5491100000000" },
};

/** FormData con las entradas dadas (helper del patrón del repo). */
function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

/** Encola el flujo previo al cobro: negocio, equipo, update e historial. */
function encolarFlujo(equipo: Record<string, unknown>) {
  db.encolar("negocios", { data: NEGOCIO, error: null });
  db.encolar("equipos", { data: equipo, error: null }); // getEquipoPorId
  db.encolar("equipos", { data: null, error: null }); // update
  db.encolar("reparaciones_historial", { data: null, error: null });
}

let db: SupabaseMock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ now: new Date("2026-09-25T12:00:00.000Z") });
  db = prepararMockSupabase(mockFrom);
  mockRequireMembership.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("marcarEntregado (issue #177)", () => {
  it("con cliente: registra el cobro con monto, concepto y medio de pago", async () => {
    encolarFlujo(EQUIPO);
    db.encolar("cobros", { data: null, error: null });

    const result = await marcarEntregado(
      { ok: false },
      fd({
        slug: "taller-test",
        equipo_id: "equipo-1",
        precio_final: "47000",
        medio_pago: "transferencia",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("cobros")[0].insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      cliente_id: "cliente-1",
      monto: 47000,
      concepto: "Reparación 0001 — Notebook Samsung Galaxy Book",
      medio_pago: "transferencia",
      fecha: "2026-09-25",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/taller-test/reparaciones/equipo-1",
    );
  });

  it("sin medio_pago en el form: asume efectivo", async () => {
    encolarFlujo(EQUIPO);
    db.encolar("cobros", { data: null, error: null });

    const result = await marcarEntregado(
      { ok: false },
      fd({
        slug: "taller-test",
        equipo_id: "equipo-1",
        precio_final: "47000",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("cobros")[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({ medio_pago: "efectivo" }),
    );
  });

  it("sin cliente_id: NO inserta cobro y la entrega sigue siendo exitosa", async () => {
    encolarFlujo({ ...EQUIPO, cliente_id: null, clientes: null });
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await marcarEntregado(
      { ok: false },
      fd({
        slug: "taller-test",
        equipo_id: "equipo-1",
        precio_final: "47000",
        medio_pago: "efectivo",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("cobros")).toHaveLength(0);
    expect(spyError).toHaveBeenCalledWith(
      "[marcarEntregado] sin cliente: no se registra el cobro de la reparación",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/taller-test");
  });

  it("si el insert del cobro falla: loguea y la entrega sigue siendo exitosa", async () => {
    encolarFlujo(EQUIPO);
    db.encolar("cobros", { data: null, error: errorPostgrest("boom cobro") });
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await marcarEntregado(
      { ok: false },
      fd({
        slug: "taller-test",
        equipo_id: "equipo-1",
        precio_final: "47000",
        medio_pago: "mercadopago",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(spyError).toHaveBeenCalledWith(
      "[marcarEntregado] cobro:",
      "boom cobro",
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/taller-test");
  });
});
