// lib/domain/rutas-publicas.test.ts
//
// Red de seguridad de la decisión de ruta pública del gate (proxy.ts): el
// portal del alumno y el seguimiento son alcanzables sin sesión; el resto del
// negocio queda detrás del login.

import { describe, expect, it } from "vitest";
import { esRutaPublica } from "./rutas-publicas";

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("esRutaPublica", () => {
  it.each([
    "/login",
    "/taller-x/seguimiento/1234",
    `/taller-x/portal/${TOKEN}`,
    "/taller-x/icon",
  ])("permite %s sin sesión", (pathname) => {
    expect(esRutaPublica(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/taller-x",
    "/taller-x/reparaciones",
    "/taller-x/portal",
    "/portal",
    "/login/extra",
    "/taller-x/reparaciones/portal",
  ])("protege %s", (pathname) => {
    expect(esRutaPublica(pathname)).toBe(false);
  });
});
