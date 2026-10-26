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
  it("devuelve api.whatsapp.com/send con teléfono normalizado y texto encodeURIComponent", () => {
    expect(buildWhatsAppLink("11 5555-1234", "Hola Ana")).toBe(
      "https://api.whatsapp.com/send/?phone=541155551234&text=Hola%20Ana",
    );
  });

  it("preserva los emojis en el texto (el redirect de wa.me los rompía)", () => {
    // El short link wa.me redirigía y su redirector re-codificaba el `text`:
    // el 👋 llegaba como U+FFFD. Ir directo a api.whatsapp.com lo conserva.
    const link = buildWhatsAppLink("11 5555-1234", "Hola Ana 👋");
    expect(link).toContain("text=Hola%20Ana%20%F0%9F%91%8B");
    expect(link).not.toContain("wa.me");
  });
});
