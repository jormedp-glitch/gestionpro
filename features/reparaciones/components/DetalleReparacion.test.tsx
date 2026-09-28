// features/reparaciones/components/DetalleReparacion.test.tsx
//
// Test de la integración reparación → turno (#180): el botón "Agendar
// retiro/entrega" abre el modal de turno con cliente, teléfono, servicio y
// notas prellenados desde el equipo. Se renderiza el componente real con las
// Server Actions y el router mockeados (mismo patrón que
// NegocioShell.test.tsx) y el modal de turno REAL, para verificar el prefill
// de punta a punta sin tocar la base.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/features/reparaciones/actions/reparaciones", () => ({
  agregarRepuesto: vi.fn(),
  eliminarRepuesto: vi.fn(),
  guardarPresupuesto: vi.fn(),
  marcarEntregado: vi.fn(),
  cambiarEstado: vi.fn(),
}));
vi.mock("@/features/turnos/actions/turnos", () => ({ crearTurno: vi.fn() }));
vi.mock("@/lib/ui/toast", () => ({ toast: vi.fn(), Toaster: () => null }));

import { DetalleReparacion } from "./DetalleReparacion";
import type { EquipoConCliente } from "@/features/reparaciones/data/reparaciones";

const EQUIPO: EquipoConCliente = {
  id: "equipo-1",
  negocio_id: "negocio-1",
  cliente_id: "cliente-1",
  numero_orden: "0042",
  categoria: "Notebook",
  marca: "Lenovo",
  modelo: "IdeaPad 3",
  numero_serie: null,
  problema_reportado: "No enciende",
  accesorios: null,
  fecha_ingreso: "2026-09-20T10:00:00Z",
  fecha_estimada_entrega: null,
  estado: "en_reparacion",
  tecnico_asignado: null,
  presupuesto: null,
  presupuesto_aceptado: null,
  precio_final: null,
  fecha_entrega: null,
  observaciones_internas: null,
  created_at: "2026-09-20T10:00:00Z",
  clientes: { nombre: "Ana Pérez", telefono: "5491112345678" },
};

describe("DetalleReparacion (#180: agendar turno desde la reparación)", () => {
  it("el botón abre el modal con los valores prellenados del equipo", async () => {
    const user = userEvent.setup();
    render(
      <DetalleReparacion
        slug="taller-test"
        rubro="servicio_tecnico"
        equipo={EQUIPO}
        historial={[]}
        repuestos={[]}
      />,
    );

    expect(screen.queryByText("📅 Nuevo Turno")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Agendar retiro\/entrega/ }),
    );

    expect(screen.getByText("📅 Nuevo Turno")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cliente o tarea")).toHaveValue(
      "Ana Pérez",
    );
    expect(screen.getByPlaceholderText(/Teléfono/)).toHaveValue(
      "5491112345678",
    );
    expect(screen.getByPlaceholderText("Servicio")).toHaveValue(
      "Retiro/Entrega Notebook Lenovo IdeaPad 3",
    );
    expect(screen.getByPlaceholderText("Notas (opcional)")).toHaveValue(
      "Reparación 0042",
    );
  });
});
