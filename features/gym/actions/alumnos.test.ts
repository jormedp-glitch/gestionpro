// features/gym/actions/alumnos.test.ts
//
// Tests de las Server Actions de alumnos (spec R2 · escenario 2: alta con
// código de acceso único e IMC pendiente; R3 · escenario 3: código único por
// negocio, regenerable). Sin DB real ni red: se mockean lib/supabase/server
// (ver lib/testing/supabase-query-mock) y lib/server/negocio; revalidatePath
// con next/cache. El `portal_token` lo genera la DB (uuid unique, 0006).

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
import { agregarAlumno, regenerarCodigoAcceso } from "./alumnos";

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
  db = prepararMockSupabase(mockFrom);
  mockRequireNegocio.mockResolvedValue(NEGOCIO);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("agregarAlumno (R2 · escenario 2: alta de alumno)", () => {
  it("happy path: inserta cliente + ficha scopeados al negocio y revalida", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_alumnos", { data: null, error: null });

    const result = await agregarAlumno(
      { ok: false },
      fd({
        slug: "gym-test",
        nombre: "Ana Pérez",
        telefono: "11 5555 1234",
        email: "ana@test.com",
        objetivo: "Fuerza",
        notas: "Lesión de hombro",
        altura_cm: "170",
        fecha_nac: "1995-04-12",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockRequireNegocio).toHaveBeenCalledWith("gym-test");

    // El alta NO escribe portal_token: lo genera la DB (default uuid unique).
    expect(db.consultas("clientes")[0].insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      nombre: "Ana Pérez",
      telefono: "11 5555 1234",
      email: "ana@test.com",
      plan: null,
      cuota: null,
      vence: null,
      estado: "activo",
    });
    expect(db.consultas("gym_alumnos")[0].insert).toHaveBeenCalledWith({
      cliente_id: "cliente-1",
      negocio_id: "negocio-1",
      objetivo: "Fuerza",
      notas: "Lesión de hombro",
      altura_cm: 170,
      fecha_nac: "1995-04-12",
    });

    // IMC pendiente: sin mediciones no se toca gym_progreso (solo 2 tablas).
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(db.consultas("gym_progreso")).toHaveLength(0);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("opcionales vacíos se normalizan a null (texto vacío y altura ausente)", async () => {
    db.encolar("clientes", { data: { id: "cliente-2" }, error: null });
    db.encolar("gym_alumnos", { data: null, error: null });

    const result = await agregarAlumno(
      { ok: false },
      fd({
        slug: "gym-test",
        nombre: "Beto",
        telefono: "",
        email: "",
        objetivo: "",
        notas: "",
        altura_cm: "",
        fecha_nac: "",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("clientes")[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({ telefono: null, email: null }),
    );
    expect(db.consultas("gym_alumnos")[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({ altura_cm: null, fecha_nac: null }),
    );
  });

  it("compensa borrando el cliente si falla la ficha gym_alumnos", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_alumnos", {
      data: null,
      error: errorPostgrest("boom ficha", "23503"),
    });
    db.encolar("clientes", { data: [{ id: "cliente-1" }], error: null });

    const result = await agregarAlumno(
      { ok: false },
      fd({ slug: "gym-test", nombre: "Ana" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo guardar el alumno.",
    });
    const compensacion = db.consultas("clientes")[1];
    expect(compensacion.delete).toHaveBeenCalled();
    expect(compensacion.eq).toHaveBeenCalledWith("id", "cliente-1");
    expect(compensacion.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("si falla el insert del cliente, no toca gym_alumnos", async () => {
    db.encolar("clientes", {
      data: null,
      error: errorPostgrest("boom cliente"),
    });

    const result = await agregarAlumno(
      { ok: false },
      fd({ slug: "gym-test", nombre: "Ana" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo guardar el alumno.",
    });
    expect(db.consultas("gym_alumnos")).toHaveLength(0);
  });

  it("validación zod: nombre vacío o email inválido no tocan datos", async () => {
    const sinNombre = await agregarAlumno(
      { ok: false },
      fd({ slug: "gym-test", nombre: "   " }),
    );
    const emailMalo = await agregarAlumno(
      { ok: false },
      fd({ slug: "gym-test", nombre: "Ana", email: "no-es-un-email" }),
    );

    expect(sinNombre).toEqual({ ok: false, error: "Datos inválidos." });
    expect(emailMalo).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockRequireNegocio).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("regenerarCodigoAcceso (R3 · escenario 3: código único y regenerable)", () => {
  it("pide un portal_token nuevo y revalida", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn().mockReturnValue("token-regenerado-1"),
    });
    db.encolar("gym_alumnos", {
      data: [{ cliente_id: "cliente-1" }],
      error: null,
    });

    const result = await regenerarCodigoAcceso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1" }),
    );

    expect(result).toEqual({ ok: true });
    const consulta = db.consultas("gym_alumnos")[0];
    expect(consulta.update).toHaveBeenCalledWith({
      portal_token: "token-regenerado-1",
    });
    // Scopeado: un cliente de otro negocio no matchea ninguna fila.
    expect(consulta.eq).toHaveBeenCalledWith("cliente_id", "cliente-1");
    expect(consulta.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("dos regeneraciones generan tokens distintos (el link viejo deja de servir)", async () => {
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce("token-1")
      .mockReturnValueOnce("token-2");
    vi.stubGlobal("crypto", { randomUUID });
    db.encolar("gym_alumnos", {
      data: [{ cliente_id: "cliente-1" }],
      error: null,
    });
    db.encolar("gym_alumnos", {
      data: [{ cliente_id: "cliente-1" }],
      error: null,
    });

    await regenerarCodigoAcceso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1" }),
    );
    await regenerarCodigoAcceso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1" }),
    );

    const [primera, segunda] = db.consultas("gym_alumnos");
    expect(primera.update).toHaveBeenCalledWith({ portal_token: "token-1" });
    expect(segunda.update).toHaveBeenCalledWith({ portal_token: "token-2" });
  });

  it("sin filas afectadas (alumno ajeno) devuelve no encontrado", async () => {
    db.encolar("gym_alumnos", { data: [], error: null });

    const result = await regenerarCodigoAcceso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-ajeno" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se encontró el alumno.",
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("error de la DB → mensaje de fallo sin revalidar", async () => {
    db.encolar("gym_alumnos", {
      data: null,
      error: errorPostgrest("boom update"),
    });

    const result = await regenerarCodigoAcceso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo regenerar el acceso.",
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("validación zod: sin cliente_id no toca datos", async () => {
    const result = await regenerarCodigoAcceso(
      { ok: false },
      fd({ slug: "gym-test" }),
    );

    expect(result).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockRequireNegocio).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
