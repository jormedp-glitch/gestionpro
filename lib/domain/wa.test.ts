// lib/domain/wa.test.ts
//
// Red de seguridad aditiva sobre las utilidades wa.me (REQ-DT-8):
// normalización de teléfono argentino y deep link con texto codificado.

import { describe, it, expect } from "vitest";
import { buildWhatsAppLink, normalizarTelefono } from "./wa";

describe("normalizarTelefono", () => {
  it.each([
    ["5491155551234", "5491155551234"], // ya inicia con 549 → se conserva
    ["541155551234", "541155551234"], // ya inicia con 54 → se conserva
    ["1155551234", "541155551234"], // sin prefijo → se antepone 54
    ["011 5555-1234", "5401155551234"], // espacios/guiones se eliminan
    ["", "54"], // vacío → queda el prefijo
  ])("normalizarTelefono(%j) → %s", (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado);
  });
});

describe("buildWhatsAppLink", () => {
  it("devuelve wa.me con teléfono normalizado y texto encodeURIComponent", () => {
    expect(buildWhatsAppLink("11 5555-1234", "Hola Ana")).toBe(
      "https://wa.me/541155551234?text=Hola%20Ana",
    );
  });
});
