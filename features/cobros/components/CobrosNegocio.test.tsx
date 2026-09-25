// features/cobros/components/CobrosNegocio.test.tsx
//
// Test de la vista de cobros del negocio (spec R12 · escenario 10: el cobro
// aparece en el historial y en el total del mes). Componente presentacional:
// recibe los cobros y los clientes ya leídos, filtra el mes por prefijo
// `yyyy-mm` de `hoy` y resuelve el nombre del cliente en memoria.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CobrosNegocio } from "./CobrosNegocio";
import type { Cobro } from "@/features/cobros/data/cobros";

const HOY = "2026-09-25";

function cobro(parcial: Partial<Cobro>): Cobro {
  return {
    id: "cobro-1",
    negocio_id: "negocio-1",
    cliente_id: "cliente-1",
    monto: 15000,
    concepto: "Cuota septiembre",
    medio_pago: "transferencia",
    fecha: "2026-09-10",
    created_at: "2026-09-10T10:00:00Z",
    ...parcial,
  };
}

describe("CobrosNegocio (R12 · escenario 10: historial y total del mes)", () => {
  it("suma solo los cobros del mes de hoy y lista el historial", () => {
    render(
      <CobrosNegocio
        cobros={[
          cobro({ id: "c1", monto: 15000 }),
          cobro({
            id: "c2",
            monto: 5000,
            fecha: "2026-09-20",
            concepto: null,
            medio_pago: "otro",
          }),
          cobro({
            id: "c3",
            monto: 9999,
            fecha: "2026-08-31",
            concepto: "Cuota agosto",
            medio_pago: "mercadopago",
          }),
        ]}
        clientes={[{ id: "cliente-1", nombre: "Ana Pérez" }]}
        hoy={HOY}
      />,
    );

    // Total del mes: 15000 + 5000 (el de agosto queda afuera).
    expect(screen.getByText("$20.000")).toBeInTheDocument();
    // Los 3 cobros son del mismo cliente: el nombre se repite por fila.
    expect(screen.getAllByText("Ana Pérez")).toHaveLength(3);
    expect(screen.getByText("Cuota septiembre")).toBeInTheDocument();
    expect(screen.getByText("Transferencia")).toBeInTheDocument();
    expect(screen.getByText("Otro")).toBeInTheDocument();
    expect(screen.getByText("10/09/2026")).toBeInTheDocument();
    expect(screen.getByText("$15.000")).toBeInTheDocument();
  });

  it("un cliente borrado o de otro negocio cae a —", () => {
    render(
      <CobrosNegocio
        cobros={[cobro({ cliente_id: "cliente-fantasma", concepto: null })]}
        clientes={[]}
        hoy={HOY}
      />,
    );

    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("sin cobros muestra el estado vacío y total $0", () => {
    render(<CobrosNegocio cobros={[]} clientes={[]} hoy={HOY} />);

    expect(screen.getByText("Sin cobros registrados")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });
});
