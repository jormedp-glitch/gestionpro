// lib/ui/skeleton.test.tsx
//
// Test P2.3 de Skeleton: render RTL + clases por token.

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton (server-safe)", () => {
  it("renderiza un div con animate-pulse y bg-muted", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const el = container.querySelector("div");
    expect(el).not.toBeNull();
    expect(el?.className).toContain("animate-pulse");
    expect(el?.className).toContain("bg-muted");
    expect(el?.className).toContain("h-4");
  });
});
