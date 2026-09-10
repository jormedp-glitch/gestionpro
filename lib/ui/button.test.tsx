// lib/ui/button.test.tsx
//
// Test P2.1 de Button: render básico RTL + cobertura de variantes por token.
// Verifica que la primitiva es server-safe (sin estilos inline ni hex).

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./button";

describe("Button (server-safe)", () => {
  it("renderiza como <button> con variante default (token bg-primary)", () => {
    render(<Button>Guardar</Button>);
    const btn = screen.getByRole("button", { name: "Guardar" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("rounded-md");
  });

  it("aplica las variantes accent, outline y destructive por token", () => {
    const { rerender } = render(<Button variant="accent">Aceptar</Button>);
    expect(screen.getByRole("button", { name: "Aceptar" }).className).toContain(
      "bg-accent",
    );
    rerender(<Button variant="outline">Volver</Button>);
    expect(screen.getByRole("button", { name: "Volver" }).className).toContain(
      "border-input",
    );
    rerender(<Button variant="destructive">Borrar</Button>);
    expect(screen.getByRole("button", { name: "Borrar" }).className).toContain(
      "bg-destructive",
    );
  });

  it("no usa estilos inline", () => {
    const { container } = render(
      <Button variant="secondary">Secundario</Button>,
    );
    expect(container.querySelector("button")?.getAttribute("style")).toBeNull();
  });

  it("propaga className y expone buttonVariants", () => {
    render(<Button className="mt-2">Con clase</Button>);
    expect(
      screen.getByRole("button", { name: "Con clase" }).className,
    ).toContain("mt-2");
    expect(typeof buttonVariants).toBe("function");
  });
});
