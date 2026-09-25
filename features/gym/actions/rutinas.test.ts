// features/gym/actions/rutinas.test.ts
//
// Tests de las Server Actions de rutinas (spec R5 · escenario 5: alta con N
// sesiones y actividades con orden consistente al agregar y quitar). Sin DB
// real, sin red: se mockean lib/supabase/server (query builder fluido, ver
// lib/testing/supabase-query-mock) y lib/server/negocio.
//
// El orden de las actividades es 0,1,2…: al agregar se calcula el máximo
// actual + 1; al quitar se renumera el resto sin huecos. El ejercicio debe ser
// propio del negocio o del catálogo global (AD-3): el id solo no autoriza.

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
import { agregarActividad, crearRutina, quitarActividad } from "./rutinas";

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

describe("crearRutina (R5 · escenario 5: rutina con N sesiones)", () => {
  it("happy path: crea la rutina y sus sesiones 1..N", async () => {
    db.encolar("gym_rutinas", { data: { id: "rutina-1" }, error: null });
    db.encolar("gym_rutina_sesiones", { data: null, error: null });

    const result = await crearRutina(
      { ok: false },
      fd({
        slug: "gym-test",
        nombre: "Full body",
        descripcion: "3 días por semana",
        sesiones_total: "3",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(db.consultas("gym_rutinas")[0].insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      nombre: "Full body",
      descripcion: "3 días por semana",
      sesiones_total: 3,
    });
    expect(db.consultas("gym_rutina_sesiones")[0].insert).toHaveBeenCalledWith([
      { negocio_id: "negocio-1", rutina_id: "rutina-1", numero_sesion: 1 },
      { negocio_id: "negocio-1", rutina_id: "rutina-1", numero_sesion: 2 },
      { negocio_id: "negocio-1", rutina_id: "rutina-1", numero_sesion: 3 },
    ]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("compensa borrando la rutina si fallan las sesiones", async () => {
    db.encolar("gym_rutinas", { data: { id: "rutina-1" }, error: null });
    db.encolar("gym_rutina_sesiones", {
      data: null,
      error: errorPostgrest("boom sesiones", "23503"),
    });
    db.encolar("gym_rutinas", { data: [{ id: "rutina-1" }], error: null });

    const result = await crearRutina(
      { ok: false },
      fd({ slug: "gym-test", nombre: "Full body", sesiones_total: "2" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo guardar la rutina.",
    });
    const compensacion = db.consultas("gym_rutinas")[1];
    expect(compensacion.delete).toHaveBeenCalled();
    expect(compensacion.eq).toHaveBeenCalledWith("id", "rutina-1");
    expect(compensacion.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("validación zod: nombre vacío o sesiones_total fuera de 1..52", async () => {
    const sinNombre = await crearRutina(
      { ok: false },
      fd({ slug: "gym-test", nombre: " ", sesiones_total: "3" }),
    );
    const cero = await crearRutina(
      { ok: false },
      fd({ slug: "gym-test", nombre: "Full body", sesiones_total: "0" }),
    );
    const excedido = await crearRutina(
      { ok: false },
      fd({ slug: "gym-test", nombre: "Full body", sesiones_total: "53" }),
    );

    expect(sinNombre).toEqual({ ok: false, error: "Datos inválidos." });
    expect(cero).toEqual({ ok: false, error: "Datos inválidos." });
    expect(excedido).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("agregarActividad (R5 · escenario 5: orden incremental al final)", () => {
  it("agrega con orden = máximo actual + 1 y valida sesión y ejercicio", async () => {
    db.encolar("gym_rutina_sesiones", {
      data: { id: "sesion-1" },
      error: null,
    });
    db.encolar("gym_ejercicios", { data: { id: "ej-1" }, error: null });
    db.encolar("gym_rutina_ejercicios", { data: { orden: 1 }, error: null });
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });

    const result = await agregarActividad(
      { ok: false },
      fd({
        slug: "gym-test",
        sesion_id: "sesion-1",
        ejercicio_id: "ej-1",
        series: "4",
        repeticiones: "10-12",
        descanso_seg: "90",
        notas: "",
      }),
    );

    expect(result).toEqual({ ok: true });
    const sesion = db.consultas("gym_rutina_sesiones")[0];
    expect(sesion.eq).toHaveBeenCalledWith("id", "sesion-1");
    expect(sesion.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");

    // AD-3: solo ejercicios propios o del catálogo global (negocio_id null).
    expect(db.consultas("gym_ejercicios")[0].or).toHaveBeenCalledWith(
      "negocio_id.is.null,negocio_id.eq.negocio-1",
    );

    expect(
      db.consultas("gym_rutina_ejercicios")[1].insert,
    ).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      sesion_id: "sesion-1",
      ejercicio_id: "ej-1",
      series: 4,
      repeticiones: "10-12",
      descanso_seg: 90,
      notas: null,
      orden: 2,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("la primera actividad de la sesión arranca en orden 0", async () => {
    db.encolar("gym_rutina_sesiones", {
      data: { id: "sesion-1" },
      error: null,
    });
    db.encolar("gym_ejercicios", { data: { id: "ej-1" }, error: null });
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });

    const result = await agregarActividad(
      { ok: false },
      fd({ slug: "gym-test", sesion_id: "sesion-1", ejercicio_id: "ej-1" }),
    );

    expect(result).toEqual({ ok: true });
    expect(
      db.consultas("gym_rutina_ejercicios")[1].insert,
    ).toHaveBeenCalledWith(expect.objectContaining({ orden: 0 }));
  });

  it("rechaza una sesión de otro negocio sin tocar ejercicios", async () => {
    db.encolar("gym_rutina_sesiones", { data: null, error: null });

    const result = await agregarActividad(
      { ok: false },
      fd({ slug: "gym-test", sesion_id: "sesion-ajena", ejercicio_id: "ej-1" }),
    );

    expect(result).toEqual({ ok: false, error: "Sesión no encontrada." });
    expect(db.consultas("gym_ejercicios")).toHaveLength(0);
    expect(db.consultas("gym_rutina_ejercicios")).toHaveLength(0);
  });

  it("rechaza un ejercicio inexistente o de otro negocio", async () => {
    db.encolar("gym_rutina_sesiones", {
      data: { id: "sesion-1" },
      error: null,
    });
    db.encolar("gym_ejercicios", { data: null, error: null });

    const result = await agregarActividad(
      { ok: false },
      fd({ slug: "gym-test", sesion_id: "sesion-1", ejercicio_id: "ej-ajeno" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se encontró el ejercicio.",
    });
    expect(db.consultas("gym_rutina_ejercicios")).toHaveLength(0);
  });
});

describe("quitarActividad (R5 · escenario 5: renumeración sin huecos)", () => {
  it("borra la actividad y renumera las restantes a 0,1,2…", async () => {
    db.encolar("gym_rutina_ejercicios", {
      data: { sesion_id: "sesion-1" },
      error: null,
    });
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });
    db.encolar("gym_rutina_ejercicios", {
      data: [
        { id: "act-1", orden: 0 },
        { id: "act-2", orden: 2 },
        { id: "act-3", orden: 3 },
      ],
      error: null,
    });
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });

    const result = await quitarActividad(
      { ok: false },
      fd({ slug: "gym-test", actividad_id: "act-2" }),
    );

    expect(result).toEqual({ ok: true });
    const builders = db.consultas("gym_rutina_ejercicios");
    expect(builders).toHaveLength(5);
    expect(builders[1].delete).toHaveBeenCalled();
    expect(builders[1].eq).toHaveBeenCalledWith("id", "act-2");
    expect(builders[1].eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(builders[2].order).toHaveBeenCalledWith("orden");
    // act-1 ya estaba en 0 (no se toca); act-2 → 1 y act-3 → 2.
    expect(builders[0].update).not.toHaveBeenCalled();
    expect(builders[1].update).not.toHaveBeenCalled();
    expect(builders[2].update).not.toHaveBeenCalled();
    expect(builders[3].update).toHaveBeenCalledWith({ orden: 1 });
    expect(builders[3].eq).toHaveBeenCalledWith("id", "act-2");
    expect(builders[3].eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(builders[4].update).toHaveBeenCalledWith({ orden: 2 });
    expect(builders[4].eq).toHaveBeenCalledWith("id", "act-3");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("si el delete falla, no intenta renumerar", async () => {
    db.encolar("gym_rutina_ejercicios", {
      data: { sesion_id: "sesion-1" },
      error: null,
    });
    db.encolar("gym_rutina_ejercicios", {
      data: null,
      error: errorPostgrest("boom delete"),
    });

    const result = await quitarActividad(
      { ok: false },
      fd({ slug: "gym-test", actividad_id: "act-2" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo quitar el ejercicio.",
    });
    expect(db.consultas("gym_rutina_ejercicios")).toHaveLength(2);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("si el reorden falla, avisa que la actividad ya se quitó y revalida", async () => {
    db.encolar("gym_rutina_ejercicios", {
      data: { sesion_id: "sesion-1" },
      error: null,
    });
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });
    db.encolar("gym_rutina_ejercicios", {
      data: null,
      error: errorPostgrest("boom reorden"),
    });

    const result = await quitarActividad(
      { ok: false },
      fd({ slug: "gym-test", actividad_id: "act-2" }),
    );

    expect(result).toEqual({
      ok: false,
      error:
        "La actividad se quitó, pero no se pudo reordenar la sesión. Revisá el orden.",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("rechaza una actividad de otro negocio", async () => {
    db.encolar("gym_rutina_ejercicios", { data: null, error: null });

    const result = await quitarActividad(
      { ok: false },
      fd({ slug: "gym-test", actividad_id: "act-ajena" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo quitar el ejercicio.",
    });
    expect(db.consultas("gym_rutina_ejercicios")).toHaveLength(1);
  });

  it("validación zod: sin actividad_id no toca datos", async () => {
    const result = await quitarActividad(
      { ok: false },
      fd({ slug: "gym-test" }),
    );

    expect(result).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
