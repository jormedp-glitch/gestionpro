// features/turnos/components/NuevoTurnoModal.test.tsx
//
// Test del modal de alta de turno (rubro profesor): expone el campo `lugar`
// y la recurrencia semanal (`repetir`). Se renderiza el componente real con
// las Server Actions mockeadas (mismo patrón que TurnosAgenda.test.tsx): no
// hay DB ni red, solo se verifica el form que se envía.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { mockCrearTurno, mockActualizarTurno } = vi.hoisted(() => ({
  mockCrearTurno: vi.fn(),
  mockActualizarTurno: vi.fn(),
}));

vi.mock("@/features/turnos/actions/turnos", () => ({
  crearTurno: mockCrearTurno,
  actualizarTurno: mockActualizarTurno,
}));

import { NuevoTurnoModal } from "./NuevoTurnoModal";
import type { Turno } from "@/features/turnos/data/turnos";

const HOY = "2026-09-28";

/** Turno existente (modo edición del modal). */
const TURNO: Turno = {
  id: "turno-1",
  negocio_id: "negocio-1",
  cliente_id: null,
  cliente_nombre: "Ana",
  created_at: null,
  duracion: 30,
  estado: "confirmado",
  fecha: HOY,
  hora: "10:00",
  lugar: "Sala 3",
  notas: null,
  servicio: "Clase",
  telefono: null,
};

function renderModal(
  props: Partial<React.ComponentProps<typeof NuevoTurnoModal>> = {},
) {
  return render(
    <NuevoTurnoModal
      slug="taller-test"
      rubro="profesor"
      fechaInicial={HOY}
      onClose={() => {}}
      onToast={() => {}}
      {...props}
    />,
  );
}

describe("NuevoTurnoModal (lugar + recurrencia semanal)", () => {
  it("renderiza el input de lugar y el de repetición", () => {
    renderModal();

    expect(screen.getByPlaceholderText(/Lugar \(opcional/)).toBeInTheDocument();
    expect(
      screen.getByLabelText("Repetir cada semana por cuántas semanas"),
    ).toBeInTheDocument();
    // El texto de ayuda aclara qué hace la repetición (match por regex: el
    // texto incluye el tope dinámico y el copy puede ajustarse).
    expect(screen.getByText(/Repetir cada semana/)).toBeInTheDocument();
    expect(screen.getByText(/1 = un solo turno/)).toBeInTheDocument();
  });

  it("la repetición arranca en 1 (turno único)", () => {
    renderModal();

    expect(
      screen.getByLabelText("Repetir cada semana por cuántas semanas"),
    ).toHaveValue(1);
  });

  it("al enviar, el FormData incluye lugar y repetir", async () => {
    const user = userEvent.setup();
    let enviado: FormData | null = null;
    mockCrearTurno.mockImplementation(
      async (_prev: unknown, formData: FormData) => {
        enviado = formData;
        return { ok: true };
      },
    );

    renderModal();

    await user.type(screen.getByPlaceholderText(/Lugar \(opcional/), "Sala 2");
    await user.clear(
      screen.getByLabelText("Repetir cada semana por cuántas semanas"),
    );
    await user.type(
      screen.getByLabelText("Repetir cada semana por cuántas semanas"),
      "4",
    );
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockCrearTurno).toHaveBeenCalled());
    const datos = enviado as FormData | null;
    expect(datos).not.toBeNull();
    expect(datos?.get("lugar")).toBe("Sala 2");
    expect(datos?.get("repetir")).toBe("4");
  });

  it("en modo edición el input de repetición no se muestra", () => {
    renderModal({ turno: TURNO });

    expect(
      screen.queryByLabelText("Repetir cada semana por cuántas semanas"),
    ).not.toBeInTheDocument();
    // El lugar del turno se prellena para poder editarlo.
    expect(screen.getByPlaceholderText(/Lugar \(opcional/)).toHaveValue(
      "Sala 3",
    );
  });
});
