// features/reparaciones/components/DetalleReparacion.test.tsx
//
// Test de la integración reparación → turno (#180): el botón "Agendar
// retiro/entrega" abre el modal de turno con cliente, teléfono, servicio y
// notas prellenados desde el equipo. Se renderiza el componente real con las
// Server Actions y el router mockeados (mismo patrón que
// NegocioShell.test.tsx) y el modal de turno REAL, para verificar el prefill
// de punta a punta sin tocar la base.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/features/reparaciones/actions/reparaciones", () => ({
  agregarRepuesto: vi.fn(),
  eliminarRepuesto: vi.fn(),
  guardarPresupuesto: vi.fn(),
  marcarEntregado: vi.fn(),
  cambiarEstado: vi.fn(),
}));
vi.mock("@/features/turnos/actions/turnos", () => ({ crearTurno: vi.fn() }));
vi.mock("@/lib/ui/toast", () => ({ toast: vi.fn(), Toaster: () => null }));

import { toast } from "@/lib/ui/toast";

import { DetalleReparacion } from "./DetalleReparacion";
import type { EquipoConCliente } from "@/features/reparaciones/data/reparaciones";

const EQUIPO: EquipoConCliente = {
  id: "equipo-1",
  negocio_id: "negocio-1",
  cliente_id: "cliente-1",
  numero_orden: "0042",
  acceso_token: "token-abc",
  categoria: "Notebook",
  marca: "Lenovo",
  modelo: "IdeaPad 3",
  numero_serie: null,
  problema_reportado: "No enciende",
  accesorios: null,
  fecha_ingreso: "2026-09-20T10:00:00Z",
  fecha_estimada_entrega: null,
  estado: "en_reparacion",
  tecnico_asignado: null,
  presupuesto: null,
  presupuesto_aceptado: null,
  precio_final: null,
  fecha_entrega: null,
  observaciones_internas: null,
  created_at: "2026-09-20T10:00:00Z",
  clientes: { nombre: "Ana Pérez", telefono: "5491112345678" },
};

// Link que arma el componente con el origin de jsdom (http://localhost:3000).
const LINK_SEGUIMIENTO = `${window.location.origin}/taller-test/seguimiento/0042?token=token-abc`;

function renderDetalle(equipo: EquipoConCliente = EQUIPO) {
  return render(
    <DetalleReparacion
      slug="taller-test"
      rubro="servicio_tecnico"
      equipo={equipo}
      historial={[]}
      repuestos={[]}
    />,
  );
}

describe("DetalleReparacion (#180: agendar turno desde la reparación)", () => {
  it("el botón abre el modal con los valores prellenados del equipo", async () => {
    const user = userEvent.setup();
    render(
      <DetalleReparacion
        slug="taller-test"
        rubro="servicio_tecnico"
        equipo={EQUIPO}
        historial={[]}
        repuestos={[]}
      />,
    );

    expect(screen.queryByText("📅 Nuevo Turno")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Agendar retiro\/entrega/ }),
    );

    expect(screen.getByText("📅 Nuevo Turno")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cliente o tarea")).toHaveValue(
      "Ana Pérez",
    );
    expect(screen.getByPlaceholderText(/Teléfono/)).toHaveValue(
      "5491112345678",
    );
    expect(screen.getByPlaceholderText("Servicio")).toHaveValue(
      "Retiro/Entrega Notebook Lenovo IdeaPad 3",
    );
    expect(screen.getByPlaceholderText("Notas (opcional)")).toHaveValue(
      "Reparación 0042",
    );
  });
});

describe("DetalleReparacion (#185: reenviar/copiar link de seguimiento)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Enviar seguimiento abre WhatsApp con el link tokenizado", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    renderDetalle();

    await user.click(
      screen.getByRole("button", { name: /Enviar seguimiento/ }),
    );

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target] = openSpy.mock.calls[0];
    expect(target).toBe("_blank");
    expect(String(url)).toContain("https://wa.me/5491112345678");
    expect(decodeURIComponent(String(url))).toContain(LINK_SEGUIMIENTO);
  });

  it("Copiar link copia el link tokenizado y avisa por toast", async () => {
    const user = userEvent.setup();
    // jsdom no implementa navigator.clipboard: se mockea DESPUÉS de setup()
    // porque user-event reinstala su propio stub al configurarse.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderDetalle();

    await user.click(screen.getByRole("button", { name: /Copiar link/ }));

    expect(writeText).toHaveBeenCalledWith(LINK_SEGUIMIENTO);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Link copiado ✓", { duration: 3000 }),
    );
  });

  it("si el clipboard falla avisa que no se pudo copiar", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("sin permisos"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderDetalle();

    await user.click(screen.getByRole("button", { name: /Copiar link/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("No se pudo copiar el link", {
        duration: 3000,
      }),
    );
  });

  it("sin teléfono no hay Enviar seguimiento pero sí Copiar link", () => {
    renderDetalle({
      ...EQUIPO,
      clientes: { nombre: "Ana Pérez", telefono: "" },
    });

    expect(
      screen.queryByRole("button", { name: /Enviar seguimiento/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copiar link/ }),
    ).toBeInTheDocument();
  });
});
