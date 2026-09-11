"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/lib/ui/button";
import { Input } from "@/lib/ui/input";

const initialState: LoginState = { error: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="w-full max-w-[380px]">
      <input type="hidden" name="next" value={next} />
      <div className="mb-4">
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs text-muted-foreground"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
      </div>
      <div className="mb-5">
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs text-muted-foreground"
        >
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>
      {state.error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-400"
        >
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        variant="accent"
        className="h-auto w-full py-3 text-[0.95rem] font-bold"
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-[380px] text-center">
        <h1 className="mb-1 text-[1.6rem] font-bold">⚡ GestiónPro</h1>
        <p className="mb-8 text-muted-foreground">
          Ingresá para administrar tu negocio
        </p>
        <Suspense
          fallback={<p className="text-muted-foreground">Cargando...</p>}
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
