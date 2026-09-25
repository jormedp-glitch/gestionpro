// features/portal/contrato.test.ts
//
// Validaciones puras del portal (R15): formato del token (la capacidad del
// portal), esquemas zod de las Server Actions y rechazo de formularios
// incompletos o mal formados.

import { describe, expect, it } from "vitest";
import {
  completadoPortalSchema,
  esTokenUuid,
  tokenPortalSchema,
} from "./contrato";

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const ACTIVIDAD = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

describe("esTokenUuid", () => {
  it.each([TOKEN, TOKEN.toUpperCase(), "00000000-0000-4000-8000-000000000000"])(
    "acepta %s",
    (valor) => {
      expect(esTokenUuid(valor)).toBe(true);
    },
  );

  it.each([
    "",
    "no-es-un-token",
    "3f2504e0-4f89-41d3-9a0c-0305e82c330",
    `${TOKEN}x`,
    ` ${TOKEN}`,
    `${TOKEN}' or '1'='1`,
  ])("rechaza %s", (valor) => {
    expect(esTokenUuid(valor)).toBe(false);
  });
});

describe("completadoPortalSchema", () => {
  const valido = {
    slug: "taller-x",
    token: TOKEN,
    rutina_ejercicio_id: ACTIVIDAD,
    fecha: "2026-09-24",
  };

  it("acepta el formulario completo", () => {
    const parsed = completadoPortalSchema.safeParse(valido);
    expect(parsed.success).toBe(true);
  });

  it.each([
    ["token no uuid", { ...valido, token: "abc" }],
    ["actividad no uuid", { ...valido, rutina_ejercicio_id: "abc" }],
    ["fecha con otro formato", { ...valido, fecha: "24/09/2026" }],
    ["fecha sin ceros a la izquierda", { ...valido, fecha: "2026-9-4" }],
    ["sin fecha", { ...valido, fecha: undefined }],
    ["sin slug", { ...valido, slug: "" }],
  ])("rechaza %s", (_caso, entrada) => {
    expect(completadoPortalSchema.safeParse(entrada).success).toBe(false);
  });
});

describe("tokenPortalSchema", () => {
  it("acepta slug + token uuid", () => {
    expect(
      tokenPortalSchema.safeParse({ slug: "taller-x", token: TOKEN }).success,
    ).toBe(true);
  });

  it("rechaza un token que no es uuid", () => {
    expect(
      tokenPortalSchema.safeParse({ slug: "taller-x", token: "1234" }).success,
    ).toBe(false);
  });
});
