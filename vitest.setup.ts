import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Limpia el DOM entre tests del proyecto jsdom (primitivas de lib/ui).
// Sin esto, los renders de RTL se acumulan y los tests se contaminan.
afterEach(() => {
  cleanup();
});
