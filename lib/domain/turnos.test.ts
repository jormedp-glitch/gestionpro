// lib/domain/turnos.test.ts
//
// Tests del prefill de turno desde la reparación (#180): el turno del taller
// se agenda desde el equipo, así que cliente/teléfono salen del join y
// servicio/notas describen el retiro/entrega y el número de orden.

import { describe, expect, it } from "vitest";
import { valoresTurnoDesdeEquipo } from "./turnos";

describe("valoresTurnoDesdeEquipo", () => {
  it("con cliente completo toma nombre y teléfono del join", () => {
    expect(
      valoresTurnoDesdeEquipo({
        numero_orden: "0042",
        categoria: "Notebook",
        marca: "Lenovo",
        modelo: "IdeaPad 3",
        clientes: { nombre: "Ana Pérez", telefono: "5491112345678" },
      }),
    ).toEqual({
      clienteNombre: "Ana Pérez",
      telefono: "5491112345678",
      servicio: "Retiro/Entrega Notebook Lenovo IdeaPad 3",
      notas: "Reparación 0042",
    });
  });

  it("sin cliente deja nombre y teléfono vacíos", () => {
    expect(
      valoresTurnoDesdeEquipo({
        numero_orden: "0043",
        categoria: "TV",
        marca: "Samsung",
        modelo: null,
        clientes: null,
      }),
    ).toEqual({
      clienteNombre: "",
      telefono: "",
      servicio: "Retiro/Entrega TV Samsung",
      notas: "Reparación 0043",
    });
  });

  it("sin marca ni modelo no deja espacios dobles", () => {
    expect(
      valoresTurnoDesdeEquipo({
        numero_orden: "0044",
        categoria: "PC / Desktop",
        marca: null,
        modelo: null,
        clientes: { nombre: "Bruno", telefono: "5491199999999" },
      }),
    ).toEqual({
      clienteNombre: "Bruno",
      telefono: "5491199999999",
      servicio: "Retiro/Entrega PC / Desktop",
      notas: "Reparación 0044",
    });
  });
});
