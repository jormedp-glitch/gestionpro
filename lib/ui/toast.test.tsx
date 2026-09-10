// lib/ui/toast.test.tsx
//
// Test P3.3 de Toast con user-event (REQ-CT-3): el toast se anuncia en una
// región aria-live (REQ-UP-2) y se cierra con el botón de nombre accesible.
// duration={Infinity} evita el auto-cierre (4000ms) y hace el test
// determinista; toast.dismiss() entre tests limpia el store global de sonner.

import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Toaster, toast } from "./toast";

beforeEach(() => {
  toast.dismiss();
});

describe("Toast (client, sonner)", () => {
  it("anuncia el mensaje en una región aria-live (REQ-UP-2)", async () => {
    render(<Toaster duration={Infinity} />);
    toast("Turno confirmado");

    const region = await screen.findByLabelText("Notificaciones");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("Turno confirmado");
  });

  it("se cierra con el botón de nombre accesible (REQ-CT-3)", async () => {
    const user = userEvent.setup();
    render(<Toaster duration={Infinity} />);
    toast("Mensaje a descartar");

    const closeButton = await screen.findByRole("button", { name: "Cerrar" });
    expect(closeButton).toBeEnabled();

    await user.click(closeButton);
    await waitForElementToBeRemoved(() =>
      screen.queryByText("Mensaje a descartar"),
    );
  });
});
