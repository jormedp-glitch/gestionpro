// lib/ui/barrel.test.ts
//
// Test P2.4/P3.4 del barrel: importar cada primitivo desde lib/ui (typecheck +
// resolución de exports de REQ-UP-1). P3 agrega las islas client
// (Input, Select, Dialog, Toast).

import { describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Table,
} from "./index";

describe("barrel lib/ui (REQ-UP-1)", () => {
  it("exporta los primitivos server-safe", () => {
    expect(typeof Button).toBe("function");
    expect(typeof Badge).toBe("function");
    expect(typeof Card).toBe("function");
    expect(typeof Table).toBe("function");
    expect(typeof Skeleton).toBe("function");
    expect(typeof EmptyState).toBe("function");
  });

  it("exporta las islas client Input y Select", () => {
    expect(Input).toBeDefined();
    expect(Select).toBeDefined();
  });
});
