// features/admin/components/NegocioShell.test.tsx
//
// Test del shell del negocio (spec R1 · escenario 1: tabs por rubro). Se
// renderiza el shell REAL con las secciones hijas mockeadas: así se prueba la
// navegación por tabs (estado interno del shell) sin arrastrar las Server
// Actions ni las lecturas de cada feature.
//
// Gimnasio → Dashboard · Agenda · Alumnos · Rutinas · Cobros · Caja (sin
// Clientes); otros rubros conservan sus tabs y no ganan los del gym;
// servicio técnico mantiene Reparaciones.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/actions", () => ({ logout: vi.fn() }));
vi.mock("@/lib/ui/toast", () => ({ toast: vi.fn(), Toaster: () => null }));
vi.mock("@/features/admin/components/DashboardResumen", () => ({
  DashboardResumen: () => <div data-testid="seccion-dashboard" />,
}));
vi.mock("@/features/turnos/components/TurnosAgenda", () => ({
  TurnosAgenda: () => <div data-testid="seccion-agenda" />,
}));
vi.mock("@/features/turnos/components/NuevoTurnoModal", () => ({
  NuevoTurnoModal: () => null,
}));
vi.mock("@/features/clientes/components/ClientesLista", () => ({
  ClientesLista: () => <div data-testid="seccion-clientes" />,
}));
vi.mock("@/features/clientes/components/NuevoClienteModal", () => ({
  NuevoClienteModal: () => null,
}));
vi.mock("@/features/cobros/components/CobrosNegocio", () => ({
  CobrosNegocio: () => <div data-testid="seccion-cobros" />,
}));
vi.mock("@/features/gastos/components/GastosCaja", () => ({
  GastosCaja: () => <div data-testid="seccion-gastos" />,
}));
vi.mock("@/features/gym/components/AlumnosGym", () => ({
  AlumnosGym: () => <div data-testid="seccion-alumnos" />,
}));
vi.mock("@/features/gym/components/RutinasGym", () => ({
  RutinasGym: () => <div data-testid="seccion-rutinas" />,
}));
vi.mock("@/features/gym/components/BibliotecaEjercicios", () => ({
  BibliotecaEjercicios: () => <div data-testid="seccion-biblioteca" />,
}));

import { NegocioShell } from "./NegocioShell";

function renderShell(rubro: string, esOwner = true) {
  return render(
    <NegocioShell
      slug="gym-test"
      negocio={{
        id: "negocio-1",
        nombre: "Gym Test",
        slug: "gym-test",
        rubro,
        created_at: "2026-01-01T00:00:00Z",
      }}
      clientes={[]}
      cobros={[]}
      turnos={[]}
      gastos={[]}
      activos={0}
      ingresoMes={0}
      gastosMes={0}
      turnosHoy={[]}
      hoy="2026-09-25"
      esOwner={esOwner}
      alumnos={[]}
      progreso={[]}
      rutinas={[]}
      ejercicios={[]}
    />,
  );
}

describe("NegocioShell (R1 · escenario 1: tabs por rubro)", () => {
  it("gimnasio: muestra Alumnos, Rutinas y Cobros, y no muestra Clientes", () => {
    renderShell("gimnasio");

    for (const tab of [
      /Dashboard/,
      /Agenda/,
      /Alumnos/,
      /Rutinas/,
      /Cobros/,
      /Caja/,
    ]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("button", { name: /Clientes/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Usuarios/ })).toBeInTheDocument();
  });

  it("otro rubro: conserva Clientes y Caja sin ganar los tabs del gym", () => {
    renderShell("peluqueria");

    for (const tab of [/Dashboard/, /Agenda/, /Clientes/, /Caja/]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
    for (const tab of [/Alumnos/, /Rutinas/, /Cobros/]) {
      expect(
        screen.queryByRole("button", { name: tab }),
      ).not.toBeInTheDocument();
    }
  });

  it("servicio técnico: mantiene Reparaciones y no muestra Agenda", () => {
    renderShell("servicio_tecnico");

    expect(
      screen.getByRole("link", { name: /Reparaciones/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Agenda/ }),
    ).not.toBeInTheDocument();
  });

  it("el tab activo cambia la sección renderizada sin cambiar de ruta", async () => {
    const user = userEvent.setup();
    renderShell("gimnasio");

    expect(screen.getByTestId("seccion-dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Alumnos/ }));
    expect(screen.getByTestId("seccion-alumnos")).toBeInTheDocument();
    expect(screen.queryByTestId("seccion-dashboard")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cobros/ }));
    expect(screen.getByTestId("seccion-cobros")).toBeInTheDocument();
    expect(screen.queryByTestId("seccion-alumnos")).not.toBeInTheDocument();
  });

  it("el link a Usuarios es solo para el owner", () => {
    renderShell("gimnasio", false);

    expect(
      screen.queryByRole("link", { name: /Usuarios/ }),
    ).not.toBeInTheDocument();
  });
});
