// components/crear-negocio-form.test.tsx
//
// Tests del form de alta (SDD rubro-profesor, spec alta-negocio): opción
// "Profesor / Entrenador", input disciplina SOLO visible con profesor, y el
// RPC recibe `p_disciplina` únicamente en la rama profesor (vacío/whitespace
// → null en UI; la normalización server-side vive en la migración 0010 con
// `nullif(btrim())`). El default del form sigue siendo gimnasio (protege el
// smoke E2E que crea con default).
//
// El alta con sesión real (Auth + Supabase) no es corrida por RTL: caso
// manual en docs/casos-de-prueba-manuales.md (TC-PROF-01).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock, refreshMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import CrearNegocioForm from "./crear-negocio-form";

beforeEach(() => {
  vi.clearAllMocks();
  rpcMock.mockResolvedValue({ error: null });
});

/** Completa los campos y (si corresponde) selecciona el rubro indicado. */
async function completarForm(
  user: ReturnType<typeof userEvent.setup>,
  rubro: string,
) {
  await user.type(screen.getByPlaceholderText("Nombre del negocio"), "Ana");
  await user.type(
    screen.getByPlaceholderText("slug (ej: gym-el-oso)"),
    "ana-profe",
  );
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByRole("option", { name: rubro }));
}

describe("CrearNegocioForm (spec alta-negocio: rubro y disciplina)", () => {
  it("default del formulario: gimnasio (protege el smoke E2E)", () => {
    render(<CrearNegocioForm />);

    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveTextContent("Gimnasio");
    expect(
      screen.queryByRole("option", { name: "Profesor / Entrenador" }),
    ).not.toBeInTheDocument(); // cerrado: solo el trigger
  });

  it("ofrece los rubros vigentes (veterinaria ya no se ofrece, 2026-10-26)", async () => {
    const user = userEvent.setup();
    render(<CrearNegocioForm />);

    await user.click(screen.getByRole("combobox"));
    const opciones = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opciones).toEqual([
      "Gimnasio",
      "Peluquería",
      "Servicio Técnico",
      "Profesor / Entrenador",
    ]);
  });

  it("opción 'Profesor / Entrenador' queda seleccionada válidamente", async () => {
    const user = userEvent.setup();
    render(<CrearNegocioForm />);

    await user.click(screen.getByRole("combobox"));
    expect(
      screen.getByRole("option", { name: "Profesor / Entrenador" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("option", { name: "Profesor / Entrenador" }),
    );

    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Profesor / Entrenador",
    );
  });

  it("con gimnasio: no muestra el input disciplina ni lo envía al RPC", async () => {
    const user = userEvent.setup();
    render(<CrearNegocioForm />);

    expect(
      screen.queryByPlaceholderText(/Disciplina/i),
    ).not.toBeInTheDocument();
    await completarForm(user, "Gimnasio");
    await user.click(screen.getByRole("button", { name: /Crear/ }));

    expect(rpcMock).toHaveBeenCalledWith("crear_negocio_con_owner", {
      p_nombre: "Ana",
      p_slug: "ana-profe",
      p_rubro: "gimnasio",
    });
    const args = rpcMock.mock.calls[0][1] as Record<string, unknown>;
    expect("p_disciplina" in args).toBe(false);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("con profesor: input disciplina visible y lo envía al RPC con el valor trim-eado", async () => {
    const user = userEvent.setup();
    render(<CrearNegocioForm />);

    await completarForm(user, "Profesor / Entrenador");
    // Edge Edge (spec: el campo solo se pide con profesor): visible acá.
    const input = screen.getByPlaceholderText(/Disciplina/i);
    await user.type(input, "  Patín  ");
    await user.click(screen.getByRole("button", { name: /Crear/ }));

    expect(rpcMock).toHaveBeenCalledWith("crear_negocio_con_owner", {
      p_nombre: "Ana",
      p_slug: "ana-profe",
      p_rubro: "profesor",
      p_disciplina: "Patín",
    });
  });

  it("Edge: disciplina vacía o whitespace → envía null (alta aceptada)", async () => {
    const user = userEvent.setup();
    render(<CrearNegocioForm />);

    await completarForm(user, "Profesor / Entrenador");
    await user.type(screen.getByPlaceholderText(/Disciplina/i), "   ");
    await user.click(screen.getByRole("button", { name: /Crear/ }));

    expect(rpcMock).toHaveBeenCalledWith("crear_negocio_con_owner", {
      p_nombre: "Ana",
      p_slug: "ana-profe",
      p_rubro: "profesor",
      p_disciplina: null,
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("Edge: disciplina sin rubro profesor no se envía aunque el input se hubiera tocado", async () => {
    const user = userEvent.setup();
    render(<CrearNegocioForm />);

    // El usuario elige profesor, escribe disciplina pero vuelve a gimnasio:
    // el alta NO debe llevar disciplina.
    await completarForm(user, "Profesor / Entrenador");
    await user.type(screen.getByPlaceholderText(/Disciplina/i), "Patín");
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Gimnasio" }));
    await user.click(screen.getByRole("button", { name: /Crear/ }));

    const args = rpcMock.mock.calls[0][1] as Record<string, unknown>;
    expect(args["p_rubro"]).toBe("gimnasio");
    expect("p_disciplina" in args).toBe(false);
  });
});
