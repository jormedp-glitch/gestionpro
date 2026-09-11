// lib/domain/estados-reparacion.test.ts
//
// Red de seguridad aditiva sobre la máquina de estados de reparaciones
// (REQ-DT-3/4/5). No modifica el comportamiento de lib/domain: solo fija
// las transiciones permitidas, los destinos por estado y las constantes.

import { describe, it, expect } from "vitest";
import {
  ESTADOS,
  ESTADOS_CONTADORES,
  ORDEN_FLUJO,
  TRANSICIONES,
  puedeTransicionar,
  siguientesEstados,
} from "./estados-reparacion";

const ESTADOS_UNION = [
  "recibido",
  "en_diagnostico",
  "presupuesto_enviado",
  "esperando_aprobacion",
  "aprobado",
  "en_reparacion",
  "listo_para_retirar",
  "entregado",
  "sin_reparacion",
] as const;

describe("puedeTransicionar — matriz ESTADOS×ESTADOS (81 pares)", () => {
  const pares = ESTADOS_UNION.flatMap((from) =>
    ESTADOS_UNION.map((to) => ({
      from,
      to,
      esperado: TRANSICIONES[from]?.includes(to) ?? false,
    })),
  );

  it("la matriz es exactamente 9×9 = 81 pares", () => {
    expect(pares).toHaveLength(81);
  });

  it("el mapa declara exactamente 15 transiciones válidas", () => {
    const validas = pares.filter((p) => p.esperado);
    expect(validas).toHaveLength(15);
  });

  it.each(pares)("$from → $to devuelve $esperado", ({ from, to, esperado }) => {
    expect(puedeTransicionar(from, to)).toBe(esperado);
  });
});

describe("puedeTransicionar — estados terminales", () => {
  it.each(["entregado", "sin_reparacion"] as const)(
    "%s es terminal: ningún destino permitido",
    (estado) => {
      for (const destino of ESTADOS_UNION) {
        expect(puedeTransicionar(estado, destino)).toBe(false);
      }
    },
  );
});

describe("siguientesEstados", () => {
  it.each(ESTADOS_UNION)(
    "%s devuelve los destinos exactos de TRANSICIONES (mismo orden)",
    (estado) => {
      expect(siguientesEstados(estado)).toEqual(TRANSICIONES[estado]);
    },
  );

  it("un valor fuera del union devuelve []", () => {
    const desconocido =
      "estado_inexistente" as unknown as (typeof ESTADOS_UNION)[number];
    expect(siguientesEstados(desconocido)).toEqual([]);
  });
});

describe("constantes de flujo", () => {
  it("ORDEN_FLUJO tiene los 8 pasos del flujo ideal, sin sin_reparacion", () => {
    expect(ORDEN_FLUJO).toEqual([
      "recibido",
      "en_diagnostico",
      "presupuesto_enviado",
      "esperando_aprobacion",
      "aprobado",
      "en_reparacion",
      "listo_para_retirar",
      "entregado",
    ]);
    expect(ORDEN_FLUJO).toHaveLength(8);
    expect(ORDEN_FLUJO).not.toContain("sin_reparacion");
  });

  it("ESTADOS_CONTADORES tiene exactamente los 4 estados con contador", () => {
    expect(ESTADOS_CONTADORES).toEqual([
      "recibido",
      "en_reparacion",
      "listo_para_retirar",
      "entregado",
    ]);
    expect(ESTADOS_CONTADORES).toHaveLength(4);
  });

  it("ESTADOS tiene 9 entradas completas (valor/etiqueta/color/icono) sin duplicados", () => {
    expect(ESTADOS).toHaveLength(9);
    for (const estado of ESTADOS) {
      expect(estado.valor).toBeTruthy();
      expect(estado.etiqueta).toBeTruthy();
      expect(estado.color).toBeTruthy();
      expect(estado.icono).toBeTruthy();
    }
    const valores = ESTADOS.map((e) => e.valor);
    expect(new Set(valores).size).toBe(9);
    expect(valores).toEqual([...ESTADOS_UNION]);
  });
});
