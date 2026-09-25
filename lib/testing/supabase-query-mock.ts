// lib/testing/supabase-query-mock.ts
//
// Helper de tests: mock encadenable del query builder de supabase-js v2 para
// las Server Actions que usan `createClient()`. Sin DB real ni red: cada
// `from(tabla)` resuelve la próxima respuesta encolada para esa tabla (FIFO),
// por terminal (`single`/`maybeSingle`) o por await directo del builder.
// Las respuestas siguen el shape real de PostgrestResponse.

import { vi, type Mock } from "vitest";

export interface RespuestaSupabase {
  data?: unknown;
  error?: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
}

/** Métodos que devuelven el mismo builder (encadenables). */
const FLUIDOS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "or",
  "order",
  "limit",
] as const;

/** Builder mock: los filtros encadenan; el await resuelve la respuesta. */
export type ConsultaMock = Record<(typeof FLUIDOS)[number], Mock> & {
  single: Mock;
  maybeSingle: Mock;
  then: (
    onFulfilled?: (value: RespuestaSupabase) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

/** Error de tabla con el shape de PostgrestError (código SQL real). */
export function errorPostgrest(
  message: string,
  code = "P0001",
): RespuestaSupabase["error"] {
  return { message, details: "", hint: "", code };
}

function crearConsulta(consumir: () => RespuestaSupabase): ConsultaMock {
  const consulta = {} as ConsultaMock;
  const intentar = () => {
    try {
      return Promise.resolve(consumir());
    } catch (error) {
      return Promise.reject(error);
    }
  };
  for (const metodo of FLUIDOS) consulta[metodo] = vi.fn(() => consulta);
  consulta.single = vi.fn(intentar);
  consulta.maybeSingle = vi.fn(intentar);
  consulta.then = (onFulfilled, onRejected) =>
    intentar().then(onFulfilled, onRejected);
  return consulta;
}

/** Instala el mock en el `vi.fn()` de `createClient().from` (usar en
 * `beforeEach` si el archivo llama a `vi.restoreAllMocks()`). */
export function prepararMockSupabase(from: Mock) {
  const colas = new Map<string, RespuestaSupabase[]>();
  const registradas = new Map<string, ConsultaMock[]>();

  from.mockImplementation((tabla: string) => {
    const consulta = crearConsulta(() => {
      const respuesta = colas.get(tabla)?.shift();
      if (!respuesta) {
        throw new Error(`Sin respuesta mockeada para la tabla "${tabla}"`);
      }
      return respuesta;
    });
    registradas.set(tabla, [...(registradas.get(tabla) ?? []), consulta]);
    return consulta;
  });

  return {
    from,
    /** Encola respuestas para la tabla; se consumen en orden de llamada. */
    encolar(tabla: string, ...respuestas: RespuestaSupabase[]) {
      colas.set(tabla, [...(colas.get(tabla) ?? []), ...respuestas]);
    },
    /** Builders creados para la tabla (payloads y filtros). */
    consultas: (tabla: string) => registradas.get(tabla) ?? [],
    /** Limpia colas y builders registrados. */
    limpiar() {
      colas.clear();
      registradas.clear();
    },
  };
}

export type SupabaseMock = ReturnType<typeof prepararMockSupabase>;
