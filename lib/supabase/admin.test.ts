// lib/supabase/admin.test.ts
//
// R8 guard meta-test: reads the admin module SOURCE (not the module itself —
// importing it would trip the server-only guard in the node environment) and
// asserts the invariants: the server-only import is present, no NEXT_PUBLIC_
// env var is referenced, the server-side service-role pair is consumed, and
// the generic admin client is never re-exported.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./admin.ts", import.meta.url)),
  "utf8",
);

const exportLines = source
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("export "));

describe("lib/supabase/admin.ts — R8 server-only guard", () => {
  it("imports 'server-only' as the client-component guard", () => {
    expect(source).toContain('import "server-only"');
  });

  it("never references a NEXT_PUBLIC_ env var (secret stays server-side)", () => {
    expect(source).not.toContain("NEXT_PUBLIC_");
  });

  it("consumes the server-side service-role env pair", () => {
    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).toContain("SUPABASE_URL");
  });

  it("exposes only the two admin operations (no generic client re-export)", () => {
    expect(exportLines).toHaveLength(2);
    for (const line of exportLines) {
      expect(line).toMatch(
        /^export async function (createUserWithPassword|deleteUser)\(/,
      );
    }
  });
});
