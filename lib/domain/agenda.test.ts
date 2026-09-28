// lib/domain/agenda.test.ts
//
// Red de seguridad de la ventana semanal del dashboard (issue #187): límites
// de la ventana (hoy y día 7 dentro; día 8 y ayer fuera), orden por fecha +
// hora y etiquetas de agrupación (Hoy / Mañana / día de semana). Fechas
// fijas: sin dependencia TZ.

import { describe, expect, it } from "vitest";
import { agruparTurnosPorDia, proximosTurnos } from "./agenda";

const HOY = "2026-09-28"; // lunes

type TurnoMin = { id: string; fecha: string; hora: string };

function turno(id: string, fecha: string, hora: string): TurnoMin {
  return { id, fecha, hora };
}

describe("proximosTurnos", () => {
  it("incluye hoy y hasta hoy + 6 (día 7 de la ventana)", () => {
    const turnos = [
      turno("hoy", "2026-09-28", "10:00"),
      turno("manana", "2026-09-29", "09:00"),
      turno("dia7", "2026-10-04", "18:00"),
    ];

    expect(proximosTurnos(turnos, HOY).map((t) => t.id)).toEqual([
      "hoy",
      "manana",
      "dia7",
    ]);
  });

  it("excluye ayer y el día 8", () => {
    const turnos = [
      turno("ayer", "2026-09-27", "10:00"),
      turno("dia8", "2026-10-05", "10:00"),
      turno("hoy", "2026-09-28", "11:00"),
    ];

    expect(proximosTurnos(turnos, HOY).map((t) => t.id)).toEqual(["hoy"]);
  });

  it("ordena por fecha y luego por hora", () => {
    const turnos = [
      turno("c", "2026-09-30", "09:00"),
      turno("a", "2026-09-28", "15:00"),
      turno("b", "2026-09-28", "08:30"),
      turno("d", "2026-09-29", "12:00"),
    ];

    expect(proximosTurnos(turnos, HOY).map((t) => t.id)).toEqual([
      "b",
      "a",
      "d",
      "c",
    ]);
  });

  it("no muta la lista original", () => {
    const turnos = [
      turno("b", "2026-09-30", "09:00"),
      turno("a", "2026-09-28", "09:00"),
    ];
    const copia = [...turnos];

    proximosTurnos(turnos, HOY);

    expect(turnos).toEqual(copia);
  });

  it("con `dias` a medida ajusta el fin de la ventana", () => {
    const turnos = [
      turno("hoy", "2026-09-28", "10:00"),
      turno("manana", "2026-09-29", "10:00"),
    ];

    expect(proximosTurnos(turnos, HOY, 1).map((t) => t.id)).toEqual(["hoy"]);
  });

  it("lista vacía devuelve []", () => {
    expect(proximosTurnos([], HOY)).toEqual([]);
  });

  it("`hoy` inválido no permite calcular la ventana: devuelve []", () => {
    const turnos = [turno("a", "2026-09-28", "10:00")];

    expect(proximosTurnos(turnos, "no-es-fecha")).toEqual([]);
    expect(proximosTurnos(turnos, "2026-02-30")).toEqual([]);
  });
});

describe("agruparTurnosPorDia", () => {
  it("agrupa por fecha en orden ascendente con etiquetas Hoy / Mañana / día de semana", () => {
    const turnos = [
      turno("b", "2026-09-30", "09:00"),
      turno("a", "2026-09-28", "10:00"),
      turno("c", "2026-09-29", "11:00"),
      turno("d", "2026-09-30", "15:00"),
    ];

    const grupos = agruparTurnosPorDia(turnos, HOY);

    expect(grupos.map((g) => [g.fecha, g.etiqueta])).toEqual([
      ["2026-09-28", "Hoy"],
      ["2026-09-29", "Mañana"],
      ["2026-09-30", "Miércoles 30/09"],
    ]);
    // Conserva el orden interno recibido en cada grupo.
    expect(grupos[2].turnos.map((t) => t.id)).toEqual(["b", "d"]);
  });

  it("el cruce de año etiqueta con el día de semana correcto", () => {
    const turnos = [
      turno("a", "2026-12-31", "10:00"),
      turno("b", "2027-01-02", "10:00"),
    ];

    const grupos = agruparTurnosPorDia(turnos, "2026-12-31");

    expect(grupos.map((g) => g.etiqueta)).toEqual(["Hoy", "Sábado 02/01"]);
  });

  it("lista vacía devuelve []", () => {
    expect(agruparTurnosPorDia([], HOY)).toEqual([]);
  });
});
