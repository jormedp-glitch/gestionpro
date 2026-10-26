// features/admin/components/NegocioHeader.test.tsx
//
// Tests del header compartido (issue #183): dentro del shell las tabs de
// vista delegan en `onVista` (botones); fuera del shell (rutas) son links
// con `?vista=`; la sección activa se marca y "Usuarios" es solo del owner.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/actions", () => ({ logout: vi.fn() }));

import { NegocioHeader } from "./NegocioHeader";
import type { SeccionNav, Vista } from "./NegocioHeader";
import type { Negocio } from "@/lib/auth/dal";

const NEGOCIO: Negocio = {
  id: "negocio-1",
  nombre: "Taller Test",
  slug: "taller-test",
  rubro: "peluqueria",
  disciplina: null,
  created_at: "2026-01-01T00:00:00Z",
};

function renderHeader({
  rubro = "peluqueria",
  esOwner = false,
  activa = "dashboard",
  onVista,
  negocioOverride,
}: {
  rubro?: string;
  esOwner?: boolean;
  activa?: SeccionNav;
  onVista?: (v: Vista) => void;
  negocioOverride?: Partial<Negocio>;
} = {}) {
  return render(
    <NegocioHeader
      slug={NEGOCIO.slug}
      negocio={{ ...NEGOCIO, rubro, ...negocioOverride }}
      esOwner={esOwner}
      activa={activa}
      onVista={onVista}
    />,
  );
}

describe("NegocioHeader (issue #183: sección activa y vuelta)", () => {
  it("con onVista, click en una tab de vista delega la vista correcta", async () => {
    const user = userEvent.setup();
    const onVista = vi.fn();
    renderHeader({ onVista });

    await user.click(screen.getByRole("button", { name: /Agenda/ }));
    expect(onVista).toHaveBeenCalledWith("agenda");

    await user.click(screen.getByRole("button", { name: /Caja/ }));
    expect(onVista).toHaveBeenCalledWith("gastos");
  });

  it("sin onVista, las tabs de vista son links con ?vista= (dashboard sin query)", () => {
    renderHeader();

    expect(
      screen.queryByRole("button", { name: /Dashboard/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute(
      "href",
      "/taller-test",
    );
    expect(screen.getByRole("link", { name: /Agenda/ })).toHaveAttribute(
      "href",
      "/taller-test?vista=agenda",
    );
    expect(screen.getByRole("link", { name: /Caja/ })).toHaveAttribute(
      "href",
      "/taller-test?vista=gastos",
    );
  });

  it("marca solo la sección activa (botones del shell)", () => {
    renderHeader({ activa: "agenda", onVista: vi.fn() });

    expect(screen.getByRole("button", { name: /Agenda/ })).toHaveClass(
      "bg-accent/15",
      "text-accent-ink",
    );
    expect(screen.getByRole("button", { name: /Dashboard/ })).toHaveClass(
      "bg-transparent",
      "text-muted-foreground",
    );
  });

  it("marca solo la sección activa (links de ruta: Reparaciones)", () => {
    renderHeader({ rubro: "servicio_tecnico", activa: "reparaciones" });

    expect(screen.getByRole("link", { name: /Reparaciones/ })).toHaveClass(
      "bg-accent/15",
      "text-accent-ink",
    );
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveClass(
      "bg-transparent",
      "text-muted-foreground",
    );
    expect(screen.getByRole("link", { name: /Caja/ })).toHaveClass(
      "bg-transparent",
      "text-muted-foreground",
    );
  });

  it("servicio técnico incluye Agenda con el deep link ?vista=agenda (#189)", () => {
    renderHeader({ rubro: "servicio_tecnico" });

    expect(screen.getByRole("link", { name: /Agenda/ })).toHaveAttribute(
      "href",
      "/taller-test?vista=agenda",
    );
  });

  it("Usuarios no aparece para un no-owner", () => {
    renderHeader({ esOwner: false });

    expect(
      screen.queryByRole("link", { name: /Usuarios/ }),
    ).not.toBeInTheDocument();
  });

  it("Usuarios aparece para el owner y se marca activo cuando corresponde", () => {
    renderHeader({ esOwner: true, activa: "usuarios" });

    const usuarios = screen.getByRole("link", { name: /Usuarios/ });
    expect(usuarios).toHaveAttribute("href", "/taller-test/usuarios");
    expect(usuarios).toHaveClass("bg-accent/15", "text-accent-ink");
  });
});

describe("NegocioHeader (SDD rubro-profesor: disciplina + icono + tabs)", () => {
  it("profesor: 'Nombre — Disciplina' solo con profesor y disciplina no vacía", () => {
    renderHeader({
      rubro: "profesor",
      negocioOverride: { nombre: "Ana", disciplina: "Patín" },
    });

    expect(screen.getByText("Ana — Patín")).toBeInTheDocument();
  });

  it("profesor sin disciplina: solo el nombre, sin separador ni texto vacío", () => {
    renderHeader({
      rubro: "profesor",
      negocioOverride: { nombre: "Ana", disciplina: null },
    });

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it("profesor con disciplina whitespace/vacía: solo el nombre", () => {
    renderHeader({
      rubro: "profesor",
      negocioOverride: { nombre: "Ana", disciplina: "" },
    });

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it("rubro no profesor: la disciplina nunca se muestra aunque exista", () => {
    renderHeader({
      rubro: "gimnasio",
      negocioOverride: { nombre: "El Oso", disciplina: "CrossFit" },
    });

    expect(screen.getByText("El Oso")).toBeInTheDocument();
    expect(screen.queryByText(/CrossFit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it("profesor: icono del rubro 🏃", () => {
    renderHeader({ rubro: "profesor" });

    expect(screen.getByText("🏃")).toBeInTheDocument();
  });

  it("profesor sin onVista: tabs links 'Alumnos' y 'Entrenamientos' con ?vista= de vista gym", () => {
    renderHeader({ rubro: "profesor" });

    expect(screen.getByRole("link", { name: /Alumnos/ })).toHaveAttribute(
      "href",
      "/taller-test?vista=alumnos",
    );
    expect(
      screen.getByRole("link", { name: /Entrenamientos/ }),
    ).toHaveAttribute("href", "/taller-test?vista=rutinas");
    // Terminología de gym no aparece para profesor.
    expect(
      screen.queryByRole("link", { name: /Rutinas/ }),
    ).not.toBeInTheDocument();
  });
});
