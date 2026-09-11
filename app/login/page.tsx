"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} style={{ width: "100%", maxWidth: "380px" }}>
      <input type="hidden" name="next" value={next} />
      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="email"
          style={{
            display: "block",
            fontSize: "0.8rem",
            color: "#888",
            marginBottom: "0.4rem",
          }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          style={inputStyle}
          placeholder="tu@email.com"
        />
      </div>
      <div style={{ marginBottom: "1.25rem" }}>
        <label
          htmlFor="password"
          style={{
            display: "block",
            fontSize: "0.8rem",
            color: "#888",
            marginBottom: "0.4rem",
          }}
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          style={inputStyle}
          placeholder="••••••••"
        />
      </div>
      {state.error && (
        <p
          role="alert"
          style={{
            background: "#F8717115",
            border: "1px solid #F8717130",
            color: "#F87171",
            borderRadius: "8px",
            padding: "0.6rem 0.9rem",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          width: "100%",
          background: "#FF6B35",
          color: "#000",
          border: "none",
          borderRadius: "10px",
          padding: "0.75rem",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "0.95rem",
        }}
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}

const inputStyle = {
  width: "100%",
  background: "#1E1E28",
  border: "1px solid #333",
  color: "#fff",
  borderRadius: "8px",
  padding: "0.65rem 1rem",
  fontSize: "0.9rem",
  outline: "none",
  fontFamily: "sans-serif",
  boxSizing: "border-box" as const,
};

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#fff",
        fontFamily: "sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "380px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            marginBottom: "0.35rem",
          }}
        >
          ⚡ GestiónPro
        </h1>
        <p style={{ color: "#555", marginBottom: "2rem" }}>
          Ingresá para administrar tu negocio
        </p>
        <Suspense fallback={<p style={{ color: "#444" }}>Cargando...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
