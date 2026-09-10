// lib/ui/select.test.tsx
//
// Test P3.2 de Select con user-event (REQ-CT-3): apertura por teclado,
// selección con flechas + Enter y anuncio de la opción en el trigger
// (role="combobox", aria-expanded, data-highlighted mientras está abierto).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

function ServicioSelect() {
  return (
    <Select>
      <SelectTrigger aria-label="Servicio">
        <SelectValue placeholder="Elegir servicio..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="corte">Corte</SelectItem>
        <SelectItem value="tintura">Tintura</SelectItem>
        <SelectItem value="alisado">Alisado</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select (client, Radix)", () => {
  it("abre por teclado y selecciona con flechas + Enter (REQ-CT-3)", async () => {
    const user = userEvent.setup();
    render(<ServicioSelect />);
    const combobox = screen.getByRole("combobox", { name: "Servicio" });
    expect(combobox).toHaveAttribute("aria-expanded", "false");

    // Abre con click: la primera opción queda resaltada.
    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Corte" })).toHaveAttribute(
      "data-highlighted",
    );

    // ArrowDown mueve el resaltado a la segunda opción.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Tintura" })).toHaveAttribute(
      "data-highlighted",
    );

    // Enter confirma la selección y cierra el listbox.
    await user.keyboard("{Enter}");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    // Anuncia la opción elegida en el trigger.
    expect(combobox).toHaveTextContent("Tintura");
  });

  it("selecciona una opción con el mouse y la anuncia", async () => {
    const user = userEvent.setup();
    render(<ServicioSelect />);
    const combobox = screen.getByRole("combobox", { name: "Servicio" });

    await user.click(combobox);
    await user.click(screen.getByRole("option", { name: "Tintura" }));

    expect(combobox).toHaveTextContent("Tintura");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("muestra el placeholder antes de elegir y cierra con Escape", async () => {
    const user = userEvent.setup();
    render(<ServicioSelect />);
    const combobox = screen.getByRole("combobox", { name: "Servicio" });

    expect(combobox).toHaveTextContent("Elegir servicio...");
    await user.click(combobox);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });
});
