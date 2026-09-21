// features/miembros/actions/miembros.test.ts
//
// Tests de las Server Actions de membresías (spec R1–R7; design Testing
// Strategy: mocks de admin/server/negocio). Sin DB real, sin red: se
// mockean lib/supabase/admin, lib/supabase/server, lib/server/negocio,
// lib/auth/dal, lib/domain/contrasena, next/cache y next/navigation.
//
// El shape de los errores mockeados sigue los tipos REALES de supabase-js
// v2.114.0 instalado (open question del design resuelta con evidencia):
//   - createUser devuelve { data: { user } | null, error: AuthError | null }
//   - el error de email existente es AuthApiError con code en el enum
//     ErrorCode (user_already_exists y email_exists son ambos válidos) y
//     status 422.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const {
  mockCreateUserWithPassword,
  mockDeleteUser,
  mockRpc,
  mockRequireNegocio,
  mockRequireOwner,
  mockGenerarContrasena,
  mockRevalidatePath,
  mockRedirect,
} = vi.hoisted(() => ({
  mockCreateUserWithPassword: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockRpc: vi.fn(),
  mockRequireNegocio: vi.fn(),
  mockRequireOwner: vi.fn(),
  mockGenerarContrasena: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createUserWithPassword: mockCreateUserWithPassword,
  deleteUser: mockDeleteUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

vi.mock("@/lib/server/negocio", () => ({
  requireNegocio: mockRequireNegocio,
}));

vi.mock("@/lib/auth/dal", () => ({
  requireOwner: mockRequireOwner,
}));

vi.mock("@/lib/domain/contrasena", () => ({
  generarContrasenaTemporal: mockGenerarContrasena,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import {
  cambiarRol,
  crearUsuario,
  listarMiembros,
  quitarMiembro,
} from "./miembros";

const NEGOCIO = {
  id: "negocio-1",
  nombre: "Mi Negocio",
  slug: "mi-negocio",
  rubro: "reparaciones",
  created_at: "2026-01-01T00:00:00Z",
};

const OWNER = { id: "owner-1", email: "owner@test.com" };

/** FormData con las entradas dadas (helper del patrón del repo). */
function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

/** Error de RPC con el shape real de PostgrestError (raise exception → P0001). */
function rpcError(message: string) {
  return { message, code: "P0001", details: "", hint: "" };
}

/** Error de createUser con el shape real de AuthApiError (auth-js v2). */
function authError(code: string) {
  return {
    message: "A user with this email address has already been registered",
    status: 422,
    code,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireNegocio.mockResolvedValue(NEGOCIO);
  mockRequireOwner.mockResolvedValue(OWNER);
  mockGenerarContrasena.mockReturnValue("AbCdEf234567");
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockCreateUserWithPassword.mockResolvedValue({
    data: { user: { id: "user-nuevo-1" } },
    error: null,
  });
  mockDeleteUser.mockResolvedValue({
    data: { user: { id: "user-nuevo-1" } },
    error: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("crearUsuario (R1 alta + R7 duplicados)", () => {
  it("happy path R1: crea el usuario auth, inserta la membresía y devuelve la contraseña UNA vez", async () => {
    const result = await crearUsuario(
      { ok: false },
      fd({ slug: "mi-negocio", email: "NUEVO@Test.com", rol: "editor" }),
    );

    expect(result).toEqual({ ok: true, contrasena_temporal: "AbCdEf234567" });
    // Email normalizado por zod: trim + toLowerCase antes de tocar datos.
    expect(mockCreateUserWithPassword).toHaveBeenCalledWith(
      "nuevo@test.com",
      "AbCdEf234567",
    );
    expect(mockRpc).toHaveBeenCalledWith("agregar_miembro", {
      p_negocio_id: "negocio-1",
      p_email: "nuevo@test.com",
      p_rol: "editor",
    });
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mi-negocio/usuarios");
  });

  it("compensa borrando el usuario auth si el RPC de membresía falla", async () => {
    mockRpc.mockResolvedValue({ data: null, error: rpcError("boom rpc") });

    const result = await crearUsuario(
      { ok: false },
      fd({ slug: "mi-negocio", email: "nuevo@test.com", rol: "editor" }),
    );

    expect(result).toEqual({ ok: false, error: "boom rpc" });
    expect(mockDeleteUser).toHaveBeenCalledWith("user-nuevo-1");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("si la compensación también falla, loguea console.error y devuelve el error ORIGINAL del RPC", async () => {
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: rpcError("boom rpc") });
    mockDeleteUser.mockResolvedValue({
      data: null,
      error: { message: "boom delete", code: "500", details: "", hint: "" },
    });

    const result = await crearUsuario(
      { ok: false },
      fd({ slug: "mi-negocio", email: "nuevo@test.com", rol: "editor" }),
    );

    expect(result).toEqual({ ok: false, error: "boom rpc" });
    expect(spyError).toHaveBeenCalledWith(
      "[crearUsuario] compensación deleteUser:",
      "boom delete",
    );
    spyError.mockRestore();
  });

  it("R7 user_already_exists: sin deleteUser, solo el RPC que inserta la membresía", async () => {
    mockCreateUserWithPassword.mockResolvedValue({
      data: null,
      error: authError("user_already_exists"),
    });

    const result = await crearUsuario(
      { ok: false },
      fd({ slug: "mi-negocio", email: "existente@test.com", rol: "editor" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("agregar_miembro", {
      p_negocio_id: "negocio-1",
      p_email: "existente@test.com",
      p_rol: "editor",
    });
    // No se creó nada nuevo → no hay compensación posible.
    expect(mockDeleteUser).not.toHaveBeenCalled();
    // El usuario ya tenía su contraseña: la temporal NO se devuelve.
    expect(result.contrasena_temporal).toBeUndefined();
  });

  it("R7 email_exists (alias del enum ErrorCode) también se auto-cura con solo el RPC", async () => {
    mockCreateUserWithPassword.mockResolvedValue({
      data: null,
      error: authError("email_exists"),
    });

    const result = await crearUsuario(
      { ok: false },
      fd({ slug: "mi-negocio", email: "existente@test.com", rol: "owner" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("agregar_miembro", {
      p_negocio_id: "negocio-1",
      p_email: "existente@test.com",
      p_rol: "owner",
    });
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("si el error de createUser es otro, NO llama al RPC ni compensa", async () => {
    mockCreateUserWithPassword.mockResolvedValue({
      data: null,
      error: {
        message: "service down",
        status: 500,
        code: "unexpected_failure",
      },
    });

    const result = await crearUsuario(
      { ok: false },
      fd({ slug: "mi-negocio", email: "nuevo@test.com", rol: "editor" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se pudo crear el usuario.",
    });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("validación zod: email inválido → error sin tocar negocio ni datos", async () => {
    const result = await crearUsuario(
      { ok: false },
      fd({ slug: "mi-negocio", email: "no-es-un-email", rol: "editor" }),
    );

    expect(result).toEqual({ ok: false, error: "Email o rol inválidos." });
    expect(mockRequireNegocio).not.toHaveBeenCalled();
    expect(mockCreateUserWithPassword).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("no-owner → redirect SIN llamar al RPC (R6: editores no tocan datos)", async () => {
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mockRequireOwner.mockImplementation(async () => {
      mockRedirect("/");
    });

    await expect(
      crearUsuario(
        { ok: false },
        fd({ slug: "mi-negocio", email: "nuevo@test.com", rol: "editor" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockCreateUserWithPassword).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});

describe("listarMiembros (R2)", () => {
  it("devuelve los miembros vía RPC listar_miembros, owner-only antes de leer", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: "owner-1",
          email: "owner@test.com",
          rol: "owner",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          user_id: "editor-1",
          email: "editor@test.com",
          rol: "editor",
          created_at: "2026-01-02T00:00:00Z",
        },
      ],
      error: null,
    });

    const miembros = await listarMiembros("mi-negocio");

    expect(miembros).toHaveLength(2);
    expect(miembros[0]).toEqual(
      expect.objectContaining({ email: "owner@test.com", rol: "owner" }),
    );
    expect(mockRequireNegocio).toHaveBeenCalledWith("mi-negocio");
    expect(mockRequireOwner).toHaveBeenCalledWith("negocio-1");
    expect(mockRpc).toHaveBeenCalledWith("listar_miembros", {
      p_negocio_id: "negocio-1",
    });
  });
});

describe("cambiarRol (R3) y quitarMiembro (R4)", () => {
  it("cambiarRol llama al RPC y revalida la ruta", async () => {
    const result = await cambiarRol(
      { ok: false },
      fd({ slug: "mi-negocio", user_id: "editor-1", rol: "owner" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("cambiar_rol_miembro", {
      p_negocio_id: "negocio-1",
      p_user_id: "editor-1",
      p_rol: "owner",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mi-negocio/usuarios");
  });

  it("cambiarRol propaga el mensaje del RPC (R5: último owner)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: rpcError("No se puede quitar/demotar al último owner"),
    });

    const result = await cambiarRol(
      { ok: false },
      fd({ slug: "mi-negocio", user_id: "owner-1", rol: "editor" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "No se puede quitar/demotar al último owner",
    });
  });

  it("quitarMiembro llama al RPC y revalida la ruta", async () => {
    const result = await quitarMiembro(
      { ok: false },
      fd({ slug: "mi-negocio", user_id: "editor-1" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("quitar_miembro", {
      p_negocio_id: "negocio-1",
      p_user_id: "editor-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mi-negocio/usuarios");
  });

  it("no-owner → redirect SIN llamar al RPC en cambiarRol", async () => {
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mockRequireOwner.mockImplementation(async () => {
      mockRedirect("/");
    });

    await expect(
      cambiarRol(
        { ok: false },
        fd({ slug: "mi-negocio", user_id: "editor-1", rol: "owner" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("validación zod: user_id faltante → error sin tocar datos", async () => {
    const result = await quitarMiembro(
      { ok: false },
      fd({ slug: "mi-negocio" }),
    );

    expect(result).toEqual({ ok: false, error: "Datos inválidos." });
    expect(mockRequireNegocio).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
