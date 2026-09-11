// components/framework-states.test.tsx
//
// Estados de framework (REQ-FS-1, P4.1/P4.2): render en jsdom de loading,
// error, not-found y global-error raíz + skeleton del segmento [slug].
// Español neutro, botón de reintento funcional, 404 navega al inicio.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Loading from "@/app/loading";
import SlugLoading from "@/app/[slug]/loading";
import NotFound from "@/app/not-found";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";

describe("Estados de framework (REQ-FS-1)", () => {
  beforeEach(() => {
    // Silencia console.error (log del error en error.tsx/global-error.tsx y
    // warnings de React al renderizar <html> anidado en jsdom).
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loading raíz muestra feedback localizado (nunca pantalla en blanco)", () => {
    render(<Loading />);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("loading del segmento [slug] muestra skeleton", () => {
    const { container } = render(<SlugLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("not-found muestra 404 y navega al inicio", () => {
    render(<NotFound />);
    expect(screen.getByText("Página no encontrada")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver al inicio" }),
    ).toHaveAttribute("href", "/");
  });

  it("error recuperable muestra mensaje y reintenta", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPage error={new Error("boom")} unstable_retry={retry} />);
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("global-error renderiza fallback mínimo y reintenta", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<GlobalError error={new Error("boom")} unstable_retry={retry} />);
    // Nota: el contrato <html>/<body> propio de global-error (docs locales
    // error-handling.md) NO es asertable en jsdom — React 19 hace hoisting de
    // html/body al renderizar en un contenedor div, así que solo se verifica
    // el comportamiento del fallback aquí; la estructura la exige Next en
    // build/typecheck.
    expect(screen.getByText("Error inesperado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
