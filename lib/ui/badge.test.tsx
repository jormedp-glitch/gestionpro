// lib/ui/badge.test.tsx
//
// Test P2.2 de Badge: render básico RTL + variantes por token.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge (server-safe)", () => {
  it("renderiza con la variante default (bg-primary)", () => {
    render(<Badge>Activo</Badge>);
    const badge = screen.getByText("Activo");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("bg-primary");
  });

  it("aplica las variantes accent, outline y secondary por token", () => {
    const { rerender } = render(<Badge variant="accent">Nuevo</Badge>);
    expect(screen.getByText("Nuevo").className).toContain("bg-accent");
    rerender(<Badge variant="outline">Espera</Badge>);
    expect(screen.getByText("Espera").className).toContain("text-foreground");
    rerender(<Badge variant="secondary">Vence pronto</Badge>);
    expect(screen.getByText("Vence pronto").className).toContain("bg-muted");
  });

  it("propaga className adicional", () => {
    render(<Badge className="ml-2">Etiqueta</Badge>);
    expect(screen.getByText("Etiqueta").className).toContain("ml-2");
  });
});
