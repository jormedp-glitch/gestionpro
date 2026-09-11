// lib/ui/barrel.test.ts
//
// Test P2.4 del barrel: importar cada primitivo server-safe desde lib/ui
// (typecheck + resolución de exports de REQ-UP-1).

import { describe, expect, it } from "vitest";
import { Badge, Button, Card, EmptyState, Skeleton, Table } from "./index";

describe("barrel lib/ui (REQ-UP-1)", () => {
  it("exporta los 6 primitivos server-safe", () => {
    expect(typeof Button).toBe("function");
    expect(typeof Badge).toBe("function");
    expect(typeof Card).toBe("function");
    expect(typeof Table).toBe("function");
    expect(typeof Skeleton).toBe("function");
    expect(typeof EmptyState).toBe("function");
  });
});
