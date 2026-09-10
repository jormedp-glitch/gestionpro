// lib/ui/input.test.tsx
//
// Test P3.1 de Input: render RTL + forwardRef (el ref se reenvía al <input>
// nativo) + variantes por token. Cubre la DEVIACIÓN D8 (input nativo styled).

import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input (client, D8)", () => {
  it("renderiza un <input> nativo con type text por defecto", () => {
    render(<Input aria-label="Nombre" />);
    const input = screen.getByRole("textbox", { name: "Nombre" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input.className).toContain("border-input");
  });

  it("reenvía el ref al elemento nativo (forwardRef)", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Ref" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.tagName).toBe("INPUT");
  });

  it("respeta type explícito y propaga className", () => {
    render(<Input type="email" className="mt-2" aria-label="Correo" />);
    const input = screen.getByRole("textbox", { name: "Correo" });
    expect(input).toHaveAttribute("type", "email");
    expect(input.className).toContain("mt-2");
  });

  it("aplica la variante accent por token y no usa estilos inline", () => {
    render(<Input variant="accent" aria-label="Acento" />);
    const input = screen.getByRole("textbox", { name: "Acento" });
    expect(input.className).toContain("focus-visible:ring-accent");
    expect(input.getAttribute("style")).toBeNull();
  });
});
