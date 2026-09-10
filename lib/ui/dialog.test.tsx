// lib/ui/dialog.test.tsx
//
// Test P3.3 de Dialog con user-event (REQ-CT-3): role=dialog + aria-modal
// (REQ-UP-2, fijado explícitamente: Radix usa aria-hidden en hermanos), focus
// trap al abrir por teclado, cierre con ESC y foco devuelto al trigger.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function ConfirmarDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="accent">Confirmar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>¿Confirmar turno?</DialogTitle>
        <DialogDescription>
          Se reservará el turno para el cliente.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog (client, Radix)", () => {
  it("abre con click y expone role=dialog + aria-modal (REQ-UP-2)", async () => {
    const user = userEvent.setup();
    render(<ConfirmarDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("¿Confirmar turno?");
    expect(
      screen.getByText("Se reservará el turno para el cliente."),
    ).toBeInTheDocument();
  });

  it("atrapa el foco al abrir por teclado y lo devuelve al trigger con ESC (REQ-CT-3)", async () => {
    const user = userEvent.setup();
    render(<ConfirmarDialog />);
    const trigger = screen.getByRole("button", { name: "Confirmar" });

    // Abre por teclado: el foco entra al trap (dentro del contenido).
    trigger.focus();
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    // ESC cierra y devuelve el foco al trigger.
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("cierra con el botón de nombre accesible 'Cerrar'", async () => {
    const user = userEvent.setup();
    render(<ConfirmarDialog />);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
