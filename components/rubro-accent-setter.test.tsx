// components/rubro-accent-setter.test.tsx
//
// Island de acento por rubro (P4.6, D4): renderiza null, setea
// documentElement.dataset.rubro al montar (normalizando rubros
// desconocidos al default) y lo limpia al desmontar.

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RubroAccentSetter } from "./rubro-accent-setter";

describe("RubroAccentSetter", () => {
  afterEach(() => {
    delete document.documentElement.dataset.rubro;
  });

  it("renderiza null (island invisible, no envuelve children)", () => {
    const { container } = render(<RubroAccentSetter rubro="gimnasio" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("setea documentElement.dataset.rubro con el rubro recibido", () => {
    render(<RubroAccentSetter rubro="veterinaria" />);
    expect(document.documentElement.dataset.rubro).toBe("veterinaria");
  });

  it("normaliza rubros desconocidos al default (gimnasio)", () => {
    render(<RubroAccentSetter rubro="rubro-inventado" />);
    expect(document.documentElement.dataset.rubro).toBe("gimnasio");
  });

  it("limpia el dataset al desmontar", () => {
    const { unmount } = render(<RubroAccentSetter rubro="peluqueria" />);
    expect(document.documentElement.dataset.rubro).toBe("peluqueria");
    unmount();
    expect(document.documentElement.dataset.rubro).toBeUndefined();
  });
});
