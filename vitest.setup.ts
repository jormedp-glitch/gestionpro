import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Limpia el DOM entre tests del proyecto jsdom (primitivas de lib/ui).
// Sin esto, los renders de RTL se acumulan y los tests se contaminan.
afterEach(() => {
  cleanup();
});

// Polifills para primitivas Radix en jsdom (P3): Radix Popper/
// DismissableLayer usan ResizeObserver, pointer capture y scrollIntoView,
// que jsdom no implementa. No-op suficientes para tests de lib/ui.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = ResizeObserver;
}

if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = () => {};
}
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}
