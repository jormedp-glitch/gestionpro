// features/turnos/actions/turnos.test.ts
//
// Tests de las Server Actions de turnos: #179 (aviso optativo — el waUrl de
// confirmación solo se arma si hay teléfono Y el checkbox `avisar` vino
// marcado) y #190 (ABM de la agenda — editar, cancelar, no vino y eliminar,
// siempre scopeados al negocio). Sin DB real, sin red: se mockean
// lib/supabase/server (query builder fluido, ver
// lib/testing/supabase-query-mock), lib/server/negocio y next/cache, igual que
// features/cobros/actions/cobros.test.ts.

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
import {
  actualizarTurno,
  cancelarTurno,
  crearTurno,
  eliminarTurno,
  marcarNoAsistio,
} from "./turnos";

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

describe("actualizarTurno (#190 · edición)", () => {
  it("actualiza el turno scopeado al negocio y devuelve waUrl con avisar=on", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await actualizarTurno(
      { ok: false },
      fd({
        ...TURNO_BASE,
        turno_id: "turno-1",
        telefono: "11 5555-1234",
        avisar: "on",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.waUrl).toContain("https://wa.me/541155551234?text=");

    const consulta = db.consultas("turnos")[0];
    expect(consulta.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente_nombre: "Retiro de máquinas",
        telefono: "11 5555-1234",
        servicio: "Retiro a domicilio",
        fecha: "2026-09-28",
        hora: "09:00",
      }),
    );
    expect(consulta.eq).toHaveBeenCalledWith("id", "turno-1");
    expect(consulta.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/taller-test");
  });

  it("sin avisar: guarda los cambios sin waUrl", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await actualizarTurno(
      { ok: false },
      fd({
        ...TURNO_BASE,
        turno_id: "turno-1",
        telefono: "11 5555-1234",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.waUrl).toBeUndefined();
    expect(db.consultas("turnos")[0].update).toHaveBeenCalled();
  });
});

describe("cancelarTurno y marcarNoAsistio (#190 · estados)", () => {
  it("cancelarTurno pasa el estado a cancelado, scopeado al negocio", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await cancelarTurno(
      { ok: false },
      fd({ slug: "taller-test", turno_id: "turno-1" }),
    );

    expect(result).toEqual({ ok: true });
    const consulta = db.consultas("turnos")[0];
    expect(consulta.update).toHaveBeenCalledWith({ estado: "cancelado" });
    expect(consulta.eq).toHaveBeenCalledWith("id", "turno-1");
    expect(consulta.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/taller-test");
  });

  it("marcarNoAsistio pasa el estado a no_asistio, scopeado al negocio", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await marcarNoAsistio(
      { ok: false },
      fd({ slug: "taller-test", turno_id: "turno-1" }),
    );

    expect(result).toEqual({ ok: true });
    const consulta = db.consultas("turnos")[0];
    expect(consulta.update).toHaveBeenCalledWith({ estado: "no_asistio" });
    expect(consulta.eq).toHaveBeenCalledWith("id", "turno-1");
    expect(consulta.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
  });
});

describe("eliminarTurno (#190 · baja)", () => {
  it("borra el turno scopeado al negocio y revalida la ruta", async () => {
    db.encolar("turnos", { data: null, error: null });

    const result = await eliminarTurno(
      { ok: false },
      fd({ slug: "taller-test", turno_id: "turno-1" }),
    );

    expect(result).toEqual({ ok: true });
    const consulta = db.consultas("turnos")[0];
    expect(consulta.delete).toHaveBeenCalled();
    expect(consulta.eq).toHaveBeenCalledWith("id", "turno-1");
    expect(consulta.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/taller-test");
  });
});
