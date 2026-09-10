// lib/domain/mensajes.test.ts
//
// Red de seguridad aditiva sobre los mensajes WhatsApp centralizados
// (REQ-DT-6/7). Valida texto clave + placeholders de los 10 eventos.
// El monto NUNCA se valida con match exacto ICU (toLocaleString es-AR varía
// por entorno): se valida contenido y envoltura *$…*.

import { describe, it, expect } from "vitest";
import {
  mensajeAprobado,
  mensajeCobro,
  mensajeDemora,
  mensajeIngreso,
  mensajeListo,
  mensajePresupuesto,
  mensajeRecordatorioRetiro,
  mensajeRecordatorioTurno,
  mensajeSinReparacion,
  mensajeTurnoConfirmado,
} from "./mensajes";

const WRAPPER_MONTO = /\*\$\d[\d.]+\*/;

describe("mensajes de reparación (5 eventos)", () => {
  it("mensajeIngreso: saludo, equipo, N° de orden y link de seguimiento", () => {
    const msg = mensajeIngreso("Ana", "notebook", "42", "https://seguimiento");
    expect(msg).toContain("Hola Ana");
    expect(msg).toContain("notebook");
    expect(msg).toContain("N° de orden: *42*");
    expect(msg).toContain("https://seguimiento");
  });

  it("mensajePresupuesto: diagnóstico, equipo y monto en *$…*", () => {
    const msg = mensajePresupuesto("Ana", "notebook", 1234);
    expect(msg).toContain("diagnóstico");
    expect(msg).toContain("notebook");
    expect(msg).toContain("1.234");
    expect(msg).toMatch(WRAPPER_MONTO);
    expect(msg).toContain("¿Lo aprobamos");
  });

  it("mensajeAprobado: confirmación de aprobación y monto en *$…*", () => {
    const msg = mensajeAprobado("Ana", "notebook", 1234);
    expect(msg).toContain("confirmamos la aprobación");
    expect(msg).toContain("1.234");
    expect(msg).toMatch(WRAPPER_MONTO);
    expect(msg).toContain("arrancamos");
  });

  it("mensajeListo: listo para retirar y total a abonar en *$…*", () => {
    const msg = mensajeListo("Ana", "notebook", 5000);
    expect(msg).toContain("ya está listo");
    expect(msg).toContain("total a abonar");
    expect(msg).toContain("5.000");
    expect(msg).toMatch(WRAPPER_MONTO);
  });

  it("mensajeSinReparacion: retiro sin costo", () => {
    const msg = mensajeSinReparacion("Ana", "notebook");
    expect(msg).toContain("sin costo");
    expect(msg).toContain("retirarlo");
  });
});

describe("mensajes de turnos y cobro (5 eventos)", () => {
  it("mensajeRecordatorioRetiro: listo hace N días", () => {
    const msg = mensajeRecordatorioRetiro("Ana", "notebook", 3);
    expect(msg).toContain("listo hace *3 días*");
  });

  it("mensajeTurnoConfirmado: negocio, fecha y hora", () => {
    const msg = mensajeTurnoConfirmado(
      "Taller X",
      "Juan",
      "12/09/2026",
      "10:30",
    );
    expect(msg).toContain("Tu turno en *Taller X*");
    expect(msg).toContain("12/09/2026");
    expect(msg).toContain("10:30hs");
  });

  it("mensajeDemora: demora de 30 min y nuevo horario", () => {
    const msg = mensajeDemora("Juan", "diagnóstico", "11:00");
    expect(msg).toContain("demora de 30 min");
    expect(msg).toContain("11:00hs");
  });

  it("mensajeRecordatorioTurno: hoy a las HH:00hs y negocio en *negrita*", () => {
    const msg = mensajeRecordatorioTurno(
      "Juan",
      "diagnóstico",
      "09:00",
      "Taller X",
    );
    expect(msg).toContain("hoy a las 09:00hs");
    expect(msg).toContain("*Taller X*");
  });

  it("mensajeCobro: contacto desde el negocio y cuota pendiente", () => {
    const msg = mensajeCobro("Taller X", "Juan");
    expect(msg).toContain("desde *Taller X*");
    expect(msg).toContain("cuota está pendiente");
  });
});
