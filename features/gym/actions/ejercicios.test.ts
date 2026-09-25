// features/gym/actions/ejercicios.test.ts
//
// Tests de las Server Actions de la biblioteca de ejercicios (spec R4 ·
// escenario 4: CRUD de los propios; el catálogo global compartido es de solo
// lectura, AD-3). Sin DB real, sin red: se mockean lib/supabase/server (query
// builder fluido, ver lib/testing/supabase-query-mock) y lib/server/negocio.
//
// La defensa del catálogo global es por construcción: toda escritura lleva
// `negocio_id` del negocio actual, así que las filas globales (`negocio_id`
// null) nunca matchean el update/delete scopeado.

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
import {
  actualizarEjercicio,
  crearEjercicio,
  eliminarEjercicio,
} from "./ejercicios";

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
});

describe("crearEjercicio (R4 · escenario 4: ejercicio propio)", () => {
  it("crea el ejercicio con el negocio actual (nunca global)", async () => {
    db.encolar("gym_ejercicios", { data: null, error: null });

    const result = await crearEjercicio(
      { ok: false },
      fd({
        slug: "gym-test",
        nombre: "Sentadilla",
        grupo_muscular: "Piernas",
        descripcion: "Barra alta",
        url_video: "https://video.test/sentadilla",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("gym_ejercicios")[0].insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      nombre: "Sentadilla",
      grupo_muscular: "Piernas",
      descripcion: "Barra alta",
      url_video: "https://video.test/sentadilla",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("opcionales vacíos se normalizan a null", async () => {
    db.encolar("gym_ejercicios", { data: null, error: null });

    await crearEjercicio(
      { ok: false },
      fd({
        slug: "gym-test",
        nombre: "Plancha",
        grupo_muscular: "",
        descripcion: "",
        url_video: "",
      }),
    );

    expect(db.consultas("gym_ejercicios")[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        grupo_muscular: null,
        descripcion: null,
        url_video: null,
      }),
    );
  });

  it("validación zod: sin nombre no toca datos", async () => {
    const result = await crearEjercicio(
      { ok: false },
      fd({ slug: "gym-test", nombre: "  " }),
    );

    expect(result).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("actualizarEjercicio (R4 · escenario 4: el global no se edita)", () => {
  it("edita scopeado por id + negocio y revalida", async () => {
    db.encolar("gym_ejercicios", {
      data: [{ id: "ej-1" }],
      error: null,
    });

    const result = await actualizarEjercicio(
      { ok: false },
      fd({
        slug: "gym-test",
        ejercicio_id: "ej-1",
        nombre: "Sentadilla frontal",
      }),
    );

    expect(result).toEqual({ ok: true });
    const consulta = db.consultas("gym_ejercicios")[0];
    expect(consulta.update).toHaveBeenCalledWith({
      nombre: "Sentadilla frontal",
      grupo_muscular: null,
      descripcion: null,
      url_video: null,
    });
    expect(consulta.eq).toHaveBeenCalledWith("id", "ej-1");
    expect(consulta.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("una fila global (sin negocio_id) no matchea: devuelve no encontrado", async () => {
    db.encolar("gym_ejercicios", { data: [], error: null });

    const result = await actualizarEjercicio(
      { ok: false },
      fd({
        slug: "gym-test",
        ejercicio_id: "ej-global",
        nombre: "No se puede",
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se encontró el ejercicio.",
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("eliminarEjercicio (R4 · escenario 4: baja propia)", () => {
  it("elimina scopeado por id + negocio y revalida", async () => {
    db.encolar("gym_ejercicios", { data: [{ id: "ej-1" }], error: null });

    const result = await eliminarEjercicio(
      { ok: false },
      fd({ slug: "gym-test", ejercicio_id: "ej-1" }),
    );

    expect(result).toEqual({ ok: true });
    const consulta = db.consultas("gym_ejercicios")[0];
    expect(consulta.delete).toHaveBeenCalled();
    expect(consulta.eq).toHaveBeenCalledWith("id", "ej-1");
    expect(consulta.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("si está usado en una rutina (FK 23503) explica el motivo", async () => {
    db.encolar("gym_ejercicios", {
      data: null,
      error: errorPostgrest(
        'update or delete on table "gym_ejercicios" violates foreign key',
        "23503",
      ),
    });

    const result = await eliminarEjercicio(
      { ok: false },
      fd({ slug: "gym-test", ejercicio_id: "ej-1" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se puede eliminar: el ejercicio está usado en una rutina.",
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("sin filas afectadas devuelve no encontrado", async () => {
    db.encolar("gym_ejercicios", { data: [], error: null });

    const result = await eliminarEjercicio(
      { ok: false },
      fd({ slug: "gym-test", ejercicio_id: "ej-ajeno" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se encontró el ejercicio.",
    });
  });
});
