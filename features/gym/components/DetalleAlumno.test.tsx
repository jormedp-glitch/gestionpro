// features/gym/components/DetalleAlumno.test.tsx
//
// Ficha del alumno (R6): asignar / cambiar / desasignar rutina y avanzar la
// sesión. Caso de regresión del 2026-10-26: con la rutina TERMINADA la ficha
// solo ofrecía "Avanzar sesión" (que el server action rechaza) y "Desasignar",
// dejando al profe en un callejón sin salida: no podía asignarle la rutina
// siguiente.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/gym/actions/asignaciones", () => ({
  asignarRutina: vi.fn(),
  avanzarSesion: vi.fn(),
  desasignarRutina: vi.fn(),
}));

vi.mock("@/lib/ui/toast", () => ({
  toast: vi.fn(),
  Toaster: () => null,
}));

import { DetalleAlumno } from "./DetalleAlumno";

const ALUMNO = {
  cliente_id: "cli-1",
  objetivo: "Bajar 5 kg",
  altura_cm: 178,
  cliente: { nombre: "Juan", telefono: "+54 11 5555-0001" },
} as never;

const RUTINAS = [
  {
    id: "r1",
    nombre: "Fuerza QA",
    sesiones_total: 2,
    descripcion: null,
    activo: true,
  },
  {
    id: "r2",
    nombre: "Cardio QA",
    sesiones_total: 3,
    descripcion: null,
    activo: true,
  },
] as never;

function renderFicha(asignacion: unknown) {
  return render(
    <DetalleAlumno
      slug="gym-el-oso"
      alumno={ALUMNO}
      asignacion={asignacion as never}
      progreso={[]}
      rutinas={RUTINAS}
      completados={[]}
      actividades={[]}
    />,
  );
}

const asignacion = (sesion: number, total: number) => ({
  id: "as-1",
  cliente_id: "cli-1",
  sesion_actual: sesion,
  fecha_inicio: "2026-10-20",
  rutina: { id: "r1", nombre: "Fuerza QA", sesiones_total: total },
});

describe("DetalleAlumno (R6: asignar / cambiar / avanzar)", () => {
  it("con la rutina en curso muestra el avance y habilita 'Avanzar sesión'", () => {
    renderFicha(asignacion(1, 2));
    expect(screen.getByText(/Sesión 1 de 2/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Avanzar sesión" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Cambiar rutina" }),
    ).toBeInTheDocument();
  });

  it("con la rutina terminada: lo dice, deshabilita 'Avanzar sesión' y ofrece asignar otra", async () => {
    const user = userEvent.setup();
    renderFicha(asignacion(2, 2));

    expect(screen.getByText(/Completó todas las sesiones/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Avanzar sesión" }),
    ).toBeDisabled();

    // la salida del callejón: se puede asignar la siguiente rutina sin
    // pasar por "Desasignar"
    const cambiar = screen.getByRole("button", {
      name: "+ Asignar otra rutina",
    });
    expect(cambiar).toBeInTheDocument();
    await user.click(cambiar);
    expect(
      screen.getByRole("button", { name: "Asignar rutina" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Rutina del alumno" }),
    ).toBeInTheDocument();
  });

  it("sin rutina asignada muestra directo el formulario de asignación", () => {
    renderFicha(null);
    expect(
      screen.getByRole("button", { name: "Asignar rutina" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Rutina del alumno" }),
    ).toBeInTheDocument();
  });
});
