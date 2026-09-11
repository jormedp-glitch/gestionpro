// lib/ui/empty-state.test.tsx
//
// Test P2.3 de EmptyState: render RTL con título, descripción y acción.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState (server-safe)", () => {
  it("renderiza título y descripción", () => {
    render(
      <EmptyState
        title="Sin clientes todavía"
        description="Crea el primer cliente para comenzar"
      />,
    );
    expect(screen.getByText("Sin clientes todavía")).toBeInTheDocument();
    expect(
      screen.getByText("Crea el primer cliente para comenzar"),
    ).toBeInTheDocument();
  });

  it("renderiza la acción opcional", () => {
    render(
      <EmptyState
        title="Sin turnos para hoy"
        action={<button type="button">+ Crear turno</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "+ Crear turno" }),
    ).toBeInTheDocument();
  });

  it("omite descripción y acción cuando no se pasan", () => {
    const { container } = render(<EmptyState title="Vacío" />);
    expect(screen.getByText("Vacío")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
