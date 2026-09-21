// features/miembros/components/UsuariosPage.tsx
//
// Gestión de usuarios del negocio (client component, spec R1–R7, design D3/D6).
// Recibe los miembros ya leídos en el Server Component (R6: solo el owner
// llega acá; la page redirige antes de leer). Escrituras por Server Actions:
// alta con contraseña temporal devuelta UNA vez (D6, para copiarla a
// WhatsApp), cambio de rol (R3) y quita de miembro (R4, con confirmación como
// el patrón de DetalleReparacion). El RPC protege R5 (último owner) y R7
// (duplicados); la UI además oculta las acciones sobre la propia fila.
//
// Patrón de tabla: primitivas lib/ui (Table). Form uncontrolled: React 19
// resetea los campos tras una acción exitosa (patrón GastosCaja).

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  cambiarRol,
  crearUsuario,
  quitarMiembro,
} from "@/features/miembros/actions/miembros";
import type {
  CrearUsuarioResult,
  MiembroActionResult,
} from "@/features/miembros/actions/miembros";
import type { Miembro } from "@/features/miembros/data/miembros";
import { formatFecha } from "@/lib/domain/formato";
import { Badge } from "@/lib/ui/badge";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { EmptyState } from "@/lib/ui/empty-state";
import { Input } from "@/lib/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/ui/table";

/** Etiqueta legible del rol (owner/editor). */
function etiquetaRol(rol: string): string {
  return rol === "owner" ? "Owner" : "Editor";
}

/** Cambia el rol de un miembro (R3). Oculta el control en la propia fila. */
function CambiarRolForm({
  slug,
  miembro,
  esPropio,
}: {
  slug: string;
  miembro: Miembro;
  esPropio: boolean;
}) {
  const [state, formAction, pending] = useActionState(cambiarRol, {
    ok: false,
  } as MiembroActionResult);

  // R5: no ofrecer auto-democión ni auto-remoción en la propia fila; el RPC
  // igualmente lo rechaza si es el último owner (defensa en profundidad).
  if (esPropio) return null;

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="user_id" value={miembro.user_id} />
      <select
        name="rol"
        defaultValue={miembro.rol}
        aria-label={"Rol de " + miembro.email}
        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="owner">Owner</option>
        <option value="editor">Editor</option>
      </select>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        className="h-8"
      >
        {pending ? "..." : "Guardar"}
      </Button>
      {!state.ok && state.error && (
        <span className="text-xs text-red-400">{state.error}</span>
      )}
    </form>
  );
}

/** Quita un miembro del negocio (R4), con confirmación previa (patrón repo). */
function QuitarMiembroForm({
  slug,
  miembro,
  esPropio,
}: {
  slug: string;
  miembro: Miembro;
  esPropio: boolean;
}) {
  const [state, formAction, pending] = useActionState(quitarMiembro, {
    ok: false,
  } as MiembroActionResult);

  if (esPropio) return null;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`¿Quitar a ${miembro.email} del negocio?`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="user_id" value={miembro.user_id} />
      <Button
        type="submit"
        size="sm"
        variant="destructive"
        disabled={pending}
        className="h-8"
      >
        {pending ? "..." : "Quitar"}
      </Button>
      {!state.ok && state.error && (
        <span className="text-xs text-red-400">{state.error}</span>
      )}
    </form>
  );
}

export function UsuariosPage({
  slug,
  miembros,
  usuarioActualId,
}: {
  slug: string;
  miembros: Miembro[];
  usuarioActualId: string;
}) {
  const [state, formAction, pending] = useActionState(crearUsuario, {
    ok: false,
  } as CrearUsuarioResult);
  const [contrasena, setContrasena] = useState<string | null>(null);
  const [copiada, setCopiada] = useState(false);
  const manejada = useRef(false);

  // D6: la contraseña temporal viaja UNA vez en el resultado; se captura y se
  // muestra en un bloque hasta que el usuario la copie o la descarte. Nunca
  // se persiste: si recarga la página, ya no está.
  useEffect(() => {
    if (!state.ok || !state.contrasena_temporal) {
      manejada.current = false;
      return;
    }
    if (manejada.current) return;
    manejada.current = true;
    setCopiada(false);
    setContrasena(state.contrasena_temporal);
  }, [state]);

  async function copiarContrasena() {
    try {
      await navigator.clipboard.writeText(contrasena ?? "");
      setCopiada(true);
    } catch {
      // Clipboard no disponible (contexto no seguro): el usuario puede
      // copiar el texto a mano del bloque.
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">👥 Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          {miembros.length} {miembros.length === 1 ? "miembro" : "miembros"} en
          el negocio
        </p>
      </div>

      <Card className="mb-6 p-6">
        <h2 className="mb-3 font-semibold">+ Dar de alta un usuario</h2>
        <form
          action={formAction}
          className="grid grid-cols-[1fr_150px_auto] items-end gap-3"
        >
          <input type="hidden" name="slug" value={slug} />
          <Input
            type="email"
            name="email"
            placeholder="Email del usuario"
            required
          />
          <select
            name="rol"
            defaultValue="editor"
            aria-label="Rol del nuevo usuario"
            className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
          </select>
          <Button
            type="submit"
            variant="accent"
            disabled={pending}
            className="h-10 whitespace-nowrap rounded-[10px] font-bold"
          >
            {pending ? "Creando..." : "+ Crear usuario"}
          </Button>
        </form>
        {!state.ok && state.error && (
          <p className="mt-3 text-sm text-red-400">{state.error}</p>
        )}

        {contrasena && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <p className="text-sm font-semibold">
              Usuario creado ✓ Contraseña temporal (se muestra una sola vez):
            </p>
            <p className="my-2 rounded-lg bg-background px-3 py-2 font-mono text-base font-bold">
              {contrasena}
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Pasala por WhatsApp al usuario: no se vuelve a mostrar ni se
              guarda.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="accent"
                onClick={copiarContrasena}
              >
                {copiada ? "✓ Copiada" : "Copiar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setContrasena(null)}
              >
                Listo
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        {miembros.length === 0 ? (
          <EmptyState
            title="Sin usuarios todavía"
            description="Dá de alta el primer miembro del negocio."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {miembros.map((m) => {
                const esPropio = m.user_id === usuarioActualId;
                return (
                  <TableRow key={m.user_id}>
                    <TableCell>
                      <span className="font-medium">{m.email}</span>
                      {esPropio && (
                        <Badge variant="accent" className="ml-2">
                          Vos
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.rol === "owner" ? "accent" : "secondary"}
                      >
                        {etiquetaRol(m.rol)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatFecha(m.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CambiarRolForm
                          slug={slug}
                          miembro={m}
                          esPropio={esPropio}
                        />
                        <QuitarMiembroForm
                          slug={slug}
                          miembro={m}
                          esPropio={esPropio}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
