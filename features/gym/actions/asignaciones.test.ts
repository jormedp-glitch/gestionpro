// features/gym/actions/asignaciones.test.ts
//
// Tests de las Server Actions de asignaciones y progreso (spec R6 · escenario 6:
// reasignar desactiva la activa anterior y la nueva arranca en sesión 1 con la
// fecha de hoy; escenario 7: el avance topa en sesiones_total; R7 · escenario 8:
// una medición sin peso se rechaza). Sin DB real, sin red: se mockean
// lib/supabase/server (query builder fluido, ver lib/testing/supabase-query-mock)
// y lib/server/negocio.
//
// AD-4: la única asignación activa por alumno la garantiza el índice parcial de
// 0006; la acción desactiva antes de insertar y compensa (reactiva) si el insert
// falla. El peso es obligatorio y positivo por zod, antes de tocar la DB.

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
  asignarRutina,
  avanzarSesion,
  registrarProgreso,
} from "./asignaciones";

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

describe("asignarRutina (R6 · escenario 6: reasignación)", () => {
  it("desactiva la activa anterior e inserta la nueva en sesión 1 con la fecha de hoy", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_rutinas", { data: { id: "rutina-2" }, error: null });
    db.encolar("gym_asignaciones", {
      data: [{ id: "asig-vieja" }],
      error: null,
    });
    db.encolar("gym_asignaciones", { data: null, error: null });

    const result = await asignarRutina(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1", rutina_id: "rutina-2" }),
    );

    expect(result).toEqual({ ok: true });
    const [desactivar, insertar] = db.consultas("gym_asignaciones");
    expect(desactivar.update).toHaveBeenCalledWith({ activa: false });
    expect(desactivar.eq).toHaveBeenCalledWith("cliente_id", "cliente-1");
    expect(desactivar.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(desactivar.eq).toHaveBeenCalledWith("activa", true);

    const hoy = new Date().toISOString().split("T")[0];
    expect(insertar.insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      cliente_id: "cliente-1",
      rutina_id: "rutina-2",
      sesion_actual: 1,
      fecha_inicio: hoy,
      activa: true,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("valida cliente y rutina scopeados al negocio antes de escribir", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_rutinas", { data: { id: "rutina-2" }, error: null });
    db.encolar("gym_asignaciones", { data: [], error: null });
    db.encolar("gym_asignaciones", { data: null, error: null });

    await asignarRutina(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1", rutina_id: "rutina-2" }),
    );

    expect(db.consultas("clientes")[0].eq).toHaveBeenCalledWith(
      "negocio_id",
      "negocio-1",
    );
    expect(db.consultas("gym_rutinas")[0].eq).toHaveBeenCalledWith(
      "negocio_id",
      "negocio-1",
    );
  });

  it("si falla el insert, reactiva la asignación anterior (compensación)", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_rutinas", { data: { id: "rutina-2" }, error: null });
    db.encolar("gym_asignaciones", {
      data: [{ id: "asig-vieja" }],
      error: null,
    });
    db.encolar("gym_asignaciones", {
      data: null,
      error: errorPostgrest("boom insert", "23505"),
    });
    db.encolar("gym_asignaciones", { data: null, error: null });

    const result = await asignarRutina(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1", rutina_id: "rutina-2" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo asignar la rutina.",
    });
    const compensacion = db.consultas("gym_asignaciones")[2];
    expect(compensacion.update).toHaveBeenCalledWith({ activa: true });
    expect(compensacion.eq).toHaveBeenCalledWith("id", "asig-vieja");
    expect(compensacion.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("si la compensación también falla, avisa que no pudo restaurar la anterior", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_rutinas", { data: { id: "rutina-2" }, error: null });
    db.encolar("gym_asignaciones", {
      data: [{ id: "asig-vieja" }],
      error: null,
    });
    db.encolar("gym_asignaciones", {
      data: null,
      error: errorPostgrest("boom insert", "23505"),
    });
    db.encolar("gym_asignaciones", {
      data: null,
      error: errorPostgrest("boom compensación"),
    });

    const result = await asignarRutina(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1", rutina_id: "rutina-2" }),
    );

    expect(result).toEqual({
      ok: false,
      error:
        "No se pudo asignar la rutina y tampoco restaurar la asignación anterior. Revisá las asignaciones del alumno.",
    });
  });

  it("sin asignación previa activa, un insert fallido no compensa nada", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_rutinas", { data: { id: "rutina-2" }, error: null });
    db.encolar("gym_asignaciones", { data: [], error: null });
    db.encolar("gym_asignaciones", {
      data: null,
      error: errorPostgrest("boom insert"),
    });

    const result = await asignarRutina(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1", rutina_id: "rutina-2" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo asignar la rutina.",
    });
    expect(db.consultas("gym_asignaciones")).toHaveLength(2);
  });

  it("rechaza un cliente de otro negocio sin escribir asignaciones", async () => {
    db.encolar("clientes", { data: null, error: null });

    const result = await asignarRutina(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-ajeno",
        rutina_id: "rutina-2",
      }),
    );

    expect(result).toEqual({ ok: false, error: "Alumno no encontrado." });
    expect(db.consultas("gym_asignaciones")).toHaveLength(0);
  });
});

describe("avanzarSesion (R6 · escenario 7: tope en sesiones_total)", () => {
  it("avanza la sesión actual en 1 sobre la asignación activa", async () => {
    db.encolar("gym_asignaciones", {
      data: {
        id: "asig-1",
        sesion_actual: 2,
        rutina: { sesiones_total: 4 },
      },
      error: null,
    });
    db.encolar("gym_asignaciones", { data: null, error: null });

    const result = await avanzarSesion(
      { ok: false },
      fd({ slug: "gym-test", asignacion_id: "asig-1" }),
    );

    expect(result).toEqual({ ok: true });
    const actualizar = db.consultas("gym_asignaciones")[1];
    expect(actualizar.update).toHaveBeenCalledWith({ sesion_actual: 3 });
    expect(actualizar.eq).toHaveBeenCalledWith("id", "asig-1");
    expect(actualizar.eq).toHaveBeenCalledWith("negocio_id", "negocio-1");
    expect(actualizar.eq).toHaveBeenCalledWith("activa", true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("en la última sesión no avanza y avisa que el plan está completo", async () => {
    db.encolar("gym_asignaciones", {
      data: {
        id: "asig-1",
        sesion_actual: 4,
        rutina: { sesiones_total: 4 },
      },
      error: null,
    });

    const result = await avanzarSesion(
      { ok: false },
      fd({ slug: "gym-test", asignacion_id: "asig-1" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "El alumno ya completó todas las sesiones.",
    });
    expect(db.consultas("gym_asignaciones")).toHaveLength(1);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("sin asignación activa (o sin rutina) devuelve no encontrada", async () => {
    db.encolar("gym_asignaciones", {
      data: { id: "asig-1", sesion_actual: 1, rutina: null },
      error: null,
    });

    const result = await avanzarSesion(
      { ok: false },
      fd({ slug: "gym-test", asignacion_id: "asig-1" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "Asignación no encontrada.",
    });
  });
});

describe("registrarProgreso (R7 · escenario 8: peso obligatorio)", () => {
  it("sin peso (o peso 0) se rechaza antes de tocar datos", async () => {
    const sinPeso = await registrarProgreso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1" }),
    );
    const pesoCero = await registrarProgreso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-1", peso: "0" }),
    );

    expect(sinPeso).toEqual({ ok: false, error: "Datos inválidos." });
    expect(pesoCero).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockRequireNegocio).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("con peso guarda la medición completa (fecha de hoy y métricas opcionales)", async () => {
    db.encolar("clientes", { data: { id: "cliente-1" }, error: null });
    db.encolar("gym_progreso", { data: null, error: null });

    const result = await registrarProgreso(
      { ok: false },
      fd({
        slug: "gym-test",
        cliente_id: "cliente-1",
        peso: "82.5",
        cintura: "90",
        metrica1_nombre: "Brazo relajado",
        metrica1_valor: "35",
      }),
    );

    expect(result).toEqual({ ok: true });
    const hoy = new Date().toISOString().split("T")[0];
    expect(db.consultas("gym_progreso")[0].insert).toHaveBeenCalledWith({
      negocio_id: "negocio-1",
      cliente_id: "cliente-1",
      fecha: hoy,
      peso: 82.5,
      cintura: 90,
      cadera: null,
      porcentaje_grasa: null,
      pecho_cm: null,
      bicep_cm: null,
      metrica1_nombre: "Brazo relajado",
      metrica1_valor: 35,
      metrica2_nombre: null,
      metrica2_valor: null,
      notas: null,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/gym-test");
  });

  it("rechaza un cliente de otro negocio sin insertar la medición", async () => {
    db.encolar("clientes", { data: null, error: null });

    const result = await registrarProgreso(
      { ok: false },
      fd({ slug: "gym-test", cliente_id: "cliente-ajeno", peso: "80" }),
    );

    expect(result).toEqual({ ok: false, error: "Alumno no encontrado." });
    expect(db.consultas("gym_progreso")).toHaveLength(0);
  });
});
