// lib/ui/card.test.tsx
//
// Test P2.2 de Card: render RTL de la estructura completa (header/title/
// description/content/footer).

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card (server-safe)", () => {
  it("renderiza la estructura completa con tokens", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Detalle del día</CardDescription>
        </CardHeader>
        <CardContent>Contenido</CardContent>
        <CardFooter>Pie</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Resumen").tagName).toBe("H3");
    expect(screen.getByText("Detalle del día")).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    expect(screen.getByText("Pie")).toBeInTheDocument();
  });

  it("aplica la clase base bg-card a la superficie", () => {
    const { container } = render(<Card>Superficie</Card>);
    expect(container.firstElementChild?.className).toContain("bg-card");
    expect(container.firstElementChild?.className).toContain("rounded-xl");
  });
});
