// features/admin/components/DashboardResumen.test.tsx
//
// Test de la card "Próximos 7 días" (issue #187): el dashboard agrupa los
// turnos de la ventana semanal por día, con las etiquetas del dominio y el
// empty state propio. Se renderiza el componente real con props fijas (sin
// Server Actions ni lecturas server).

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardResumen } from "./DashboardResumen";
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

function renderDashboard(turnosSemana: Turno[]) {
  return render(
    <DashboardResumen
      clientes={[]}
      turnosHoy={turnosSemana.filter((t) => t.fecha === HOY)}
      turnosSemana={turnosSemana}
      activos={0}
      ingresoMes={0}
      gastosMes={0}
      hoy={HOY}
      negocioNombre="Negocio Test"
      onNuevoTurno={() => {}}
    />,
  );
}

describe("DashboardResumen · Próximos 7 días (#187)", () => {
  it("muestra las etiquetas de hoy y del día +3 en orden ascendente", () => {
    renderDashboard([
      turno({ id: "t1", fecha: HOY, hora: "10:00", cliente_nombre: "Ana" }),
      turno({
        id: "t2",
        fecha: "2026-10-01",
        hora: "09:00",
        cliente_nombre: "Bruno",
      }),
    ]);

    const etiquetaHoy = screen.getByText("Hoy");
    const etiquetaJueves = screen.getByText("Jueves 01/10");
    expect(
      etiquetaHoy.compareDocumentPosition(etiquetaJueves) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Bruno/)).toBeInTheDocument();
  });

  it("sin turnos en la ventana muestra el empty state nuevo", () => {
    renderDashboard([]);

    expect(
      screen.getByText("Sin turnos en los próximos 7 días"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sin turnos para hoy")).not.toBeInTheDocument();
  });

  it("el KPI de hoy cuenta solo los turnos de hoy y el alta sigue disponible", () => {
    renderDashboard([
      turno({ id: "t1", fecha: HOY, hora: "10:00" }),
      turno({ id: "t2", fecha: "2026-10-01", hora: "09:00" }),
    ]);

    // KPI "Turnos hoy": 1 (los 2 de la ventana NO se cuentan acá).
    expect(screen.getByText("Turnos hoy").parentElement).toHaveTextContent("1");
    expect(
      screen.getByRole("button", { name: "+ Nuevo turno" }),
    ).toBeInTheDocument();
  });
});
