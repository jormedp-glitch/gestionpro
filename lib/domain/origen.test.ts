// lib/domain/origen.test.ts
//
// Origen público de la app para los links que se mandan a terceros.

import { afterEach, describe, expect, it } from "vitest";
import { linkDeApp, origenApp } from "./origen";

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = ORIGINAL;
});

describe("origenApp", () => {
  it("usa NEXT_PUBLIC_APP_URL cuando está configurada (link mandable a terceros)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://gestionpro-three.vercel.app";
    expect(origenApp()).toBe("https://gestionpro-three.vercel.app");
  });

  it("ignora la barra final y los espacios del valor configurado", () => {
    process.env.NEXT_PUBLIC_APP_URL = "  https://app.test/  ";
    expect(origenApp()).toBe("https://app.test");
  });

  it("sin la variable y sin window (SSR) devuelve cadena vacía", () => {
    // Este archivo corre en el proyecto "node" de vitest (sin `window`): en
    // SSR sin la variable configurada no hay origen que devolver. La rama de
    // `window.location.origin` la cubre el test jsdom del componente que arma
    // el link de seguimiento (DetalleReparacion.test.tsx).
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(origenApp()).toBe("");
  });
});

describe("linkDeApp", () => {
  it("une el origen con el path (con o sin barra inicial)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
    expect(linkDeApp("/gym-el-oso/portal/abc")).toBe(
      "https://app.test/gym-el-oso/portal/abc",
    );
    expect(linkDeApp("gym-el-oso")).toBe("https://app.test/gym-el-oso");
  });
});
