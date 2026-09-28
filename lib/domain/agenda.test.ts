// lib/domain/agenda.test.ts
//
// Red de seguridad de la agenda: ventana semanal del dashboard (issue #187:
// límites, orden y etiquetas de agrupación) y navegación semanal (issue #189:
// sumarDias y los 7 días del strip). Fechas fijas: sin dependencia TZ.

import { describe, expect, it } from "vitest";
import {
  agruparTurnosPorDia,
  diasDeLaSemana,
  proximosTurnos,
  sumarDias,
} from "./agenda";

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

describe("sumarDias (#189 · navegación semanal)", () => {
  it("suma días con cruce de mes", () => {
    expect(sumarDias("2026-09-28", 3)).toBe("2026-10-01");
    expect(sumarDias("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("resta días (n negativo) con cruce de mes", () => {
    expect(sumarDias("2026-10-01", -3)).toBe("2026-09-28");
    expect(sumarDias("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("cruza el año en ambos sentidos", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("respeta el 29 de febrero bisiesto", () => {
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("con fecha base inválida la devuelve sin cambios", () => {
    expect(sumarDias("no-es-fecha", 7)).toBe("no-es-fecha");
    expect(sumarDias("2026-02-30", 1)).toBe("2026-02-30");
  });
});

describe("diasDeLaSemana (#189 · strip semanal)", () => {
  it("con lunes devuelve la semana completa de lunes a domingo", () => {
    expect(diasDeLaSemana("2026-09-28")).toEqual([
      { fecha: "2026-09-28", etiqueta: "LUN", numeroDia: "28" },
      { fecha: "2026-09-29", etiqueta: "MAR", numeroDia: "29" },
      { fecha: "2026-09-30", etiqueta: "MIÉ", numeroDia: "30" },
      { fecha: "2026-10-01", etiqueta: "JUE", numeroDia: "01" },
      { fecha: "2026-10-02", etiqueta: "VIE", numeroDia: "02" },
      { fecha: "2026-10-03", etiqueta: "SÁB", numeroDia: "03" },
      { fecha: "2026-10-04", etiqueta: "DOM", numeroDia: "04" },
    ]);
  });

  it("con domingo retrocede al lunes de esa semana (cruce de mes)", () => {
    const semana = diasDeLaSemana("2026-10-04");

    expect(semana[0]).toEqual({
      fecha: "2026-09-28",
      etiqueta: "LUN",
      numeroDia: "28",
    });
    expect(semana[6]).toEqual({
      fecha: "2026-10-04",
      etiqueta: "DOM",
      numeroDia: "04",
    });
  });

  it("con un día de mitad de semana cruza el año si hace falta", () => {
    // 2027-01-01 es viernes: su semana arranca el lunes 2026-12-28.
    const semana = diasDeLaSemana("2027-01-01");

    expect(semana.map((d) => d.fecha)).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });

  it("con fecha inválida no hay semana calculable: devuelve []", () => {
    expect(diasDeLaSemana("no-es-fecha")).toEqual([]);
    expect(diasDeLaSemana("2026-02-30")).toEqual([]);
  });
});
