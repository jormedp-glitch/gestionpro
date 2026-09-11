// lib/ui/table.test.tsx
//
// Test P2.2 de Table: render RTL de la estructura semántica completa.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

describe("Table (server-safe)", () => {
  it("renderiza la estructura semántica completa", () => {
    render(
      <Table>
        <TableCaption>Turnos del día</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Hora</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>09:00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Turnos del día").tagName).toBe("CAPTION");
    expect(
      screen.getByRole("columnheader", { name: "Hora" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "09:00" })).toBeInTheDocument();
  });

  it("aplica clases por token en head y caption", () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Columna</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    const head = container.querySelector("th");
    expect(head?.className).toContain("text-muted-foreground");
    expect(screen.getByText("Columna")).toBeInTheDocument();
  });
});
