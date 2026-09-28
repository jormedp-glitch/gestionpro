// features/turnos/components/TurnosAgenda.test.tsx
//
// Test de la agenda navegable (issue #189): el strip semanal muestra los 7
// días con el contador de turnos, clickear otro día lista sus turnos y el
// botón "Hoy" vuelve al día actual. Se renderiza el componente real con la
// Server Action de completar mockeada (mismo patrón que
// DetalleReparacion.test.tsx): no se envía el form, solo se necesita que el
// módulo no toque la red.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/turnos/actions/turnos", () => ({
  completarTurno: vi.fn(),
}));

import { TurnosAgenda } from "./TurnosAgenda";
import type { Turno } from "@/features/turnos/data/turnos";

const HOY = "2026-09-28"; // lunes

function turno(
  parcial: Partial<Turno> & Pick<Turno, "id" | "fecha" | "hora">,
): Turno {
  return {
    cliente_id: null,
    cliente_nombre: "Cliente",
    created_at: null,
    duracion: 30,
    estado: "pendiente",
    lugar: null,
    negocio_id: "negocio-1",
    notas: null,
    servicio: "Corte",
    telefono: null,
    ...parcial,
  };
}

const TURNOS: Turno[] = [
  turno({ id: "t1", fecha: HOY, hora: "10:00", cliente_nombre: "Ana" }),
  turno({ id: "t2", fecha: HOY, hora: "09:00", cliente_nombre: "Bruno" }),
  turno({
    id: "t3",
    fecha: "2026-09-30",
    hora: "11:00",
    cliente_nombre: "Carla",
  }),
];

function renderAgenda(turnos: Turno[] = TURNOS, onNuevoTurno = vi.fn()) {
  return render(
    <TurnosAgenda
      slug="taller-test"
      negocioNombre="Taller Test"
      turnos={turnos}
      hoy={HOY}
      onNuevoTurno={onNuevoTurno}
      showToast={() => {}}
    />,
  );
}

describe("TurnosAgenda (#189 · agenda navegable)", () => {
  it("el strip muestra los 7 días de la semana con el contador por día", () => {
    renderAgenda();

    for (const etiqueta of ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]) {
      expect(screen.getByText(etiqueta)).toBeInTheDocument();
    }

    // Lunes (hoy): 2 turnos; miércoles: 1; martes sin turnos: sin badge.
    expect(
      within(screen.getByRole("button", { name: /LUN 28/ })).getByText("2"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /MIÉ 30/ })).getByText("1"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MAR 29" })).toBeInTheDocument();
    // El día de hoy se marca aunque no esté seleccionado.
    expect(screen.getByRole("button", { name: /LUN 28/ })).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("ordena los turnos del día por hora", () => {
    renderAgenda();

    const bruno = screen.getByText(/Bruno/);
    const ana = screen.getByText(/Ana/);
    expect(
      bruno.compareDocumentPosition(ana) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("click en otro día lista sus turnos y 'Hoy' vuelve al día actual", async () => {
    const user = userEvent.setup();
    renderAgenda();

    // Hoy (lunes): sus dos turnos; Carla es del miércoles.
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Bruno/)).toBeInTheDocument();
    expect(screen.queryByText(/Carla/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Hoy" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /MIÉ 30/ }));

    expect(screen.getByText(/Carla/)).toBeInTheDocument();
    expect(screen.queryByText(/Ana/)).not.toBeInTheDocument();
    expect(screen.getByText(/Agenda — 30\/09\/2026/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hoy" }));

    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.queryByText(/Carla/)).not.toBeInTheDocument();
  });

  it("▶ mueve la semana y el alta usa el día seleccionado", async () => {
    const user = userEvent.setup();
    const onNuevoTurno = vi.fn();
    renderAgenda(TURNOS, onNuevoTurno);

    await user.click(screen.getByRole("button", { name: "Semana siguiente" }));

    // La semana siguiente arranca el lunes 2026-10-05 (sin turnos).
    expect(screen.getByText("Sin turnos este día")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LUN 05" })).toBeInTheDocument();

    // El botón del empty state también respeta el día visible.
    const botonesAlta = screen.getAllByRole("button", {
      name: "+ Nuevo turno",
    });
    await user.click(botonesAlta[1]);

    expect(onNuevoTurno).toHaveBeenCalledWith("2026-10-05");
  });
});
