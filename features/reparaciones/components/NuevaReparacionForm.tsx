// features/reparaciones/components/NuevaReparacionForm.tsx
//
// Alta de reparación (client component). El formulario envía los datos a la
// Server Action `crearReparacion` (R9); al confirmarse abre WhatsApp con el
// mensaje de ingreso (lib/domain/mensajes + wa.ts, R3/R4) y navega al
// detalle. Clientes y categorías llegan como props desde el Server Component
// (R8): el cliente nuevo se crea dentro de la acción.
// Migrado a tokens/primitivas (fase5-ui P7): cero clases de paleta cruda
// (neutros → tokens), inputs nativos → primitiva Input,
// botón primario → primitiva Button accent. El select de categoría se
// conserva nativo (validación `required` + contrato FormData intactos).

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { crearReparacion } from "@/features/reparaciones/actions/reparaciones";
import type { CrearReparacionResult } from "@/features/reparaciones/actions/reparaciones";
import { mensajeIngreso } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
import { Button } from "@/lib/ui/button";
import { Input } from "@/lib/ui/input";
import type { ClienteOpcion } from "@/features/reparaciones/data/reparaciones";

interface FormularioReparacion {
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  categoria: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  problema_reportado: string;
  accesorios: string;
  tecnico_asignado: string;
  fecha_estimada_entrega: string;
  observaciones_internas: string;
}

const FORM_INICIAL: FormularioReparacion = {
  cliente_id: "",
  cliente_nombre: "",
  cliente_telefono: "",
  categoria: "",
  marca: "",
  modelo: "",
  numero_serie: "",
  problema_reportado: "",
  accesorios: "",
  tecnico_asignado: "",
  fecha_estimada_entrega: "",
  observaciones_internas: "",
};

export function NuevaReparacionForm({
  slug,
  clientes,
  categorias,
}: {
  slug: string;
  clientes: ClienteOpcion[];
  categorias: readonly string[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(crearReparacion, {
    ok: false,
  } as CrearReparacionResult);
  const [form, setForm] = useState<FormularioReparacion>(FORM_INICIAL);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const exitoManejado = useRef(false);

  function setCampo<K extends keyof FormularioReparacion>(
    campo: K,
    valor: FormularioReparacion[K],
  ) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function seleccionarCliente(cliente: ClienteOpcion) {
    setForm((f) => ({
      ...f,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
    }));
    setClienteBusqueda(cliente.nombre);
    setMostrarDropdown(false);
  }

  function limpiarCliente() {
    setForm((f) => ({
      ...f,
      cliente_id: "",
      cliente_nombre: "",
      cliente_telefono: "",
    }));
    setClienteBusqueda("");
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) ||
      c.telefono.includes(clienteBusqueda),
  );

  // Al confirmarse el alta: abrir WhatsApp con el mensaje de ingreso y
  // navegar al detalle (mismo flujo que el page anterior, R3/R4/R10).
  useEffect(() => {
    if (!state.ok) {
      exitoManejado.current = false;
      return;
    }
    if (exitoManejado.current) return;
    exitoManejado.current = true;

    const telefono = form.cliente_telefono.trim();
    if (telefono && state.id && state.acceso_token && state.numero_orden) {
      const equipoNombre = `${form.categoria}${form.marca ? " " + form.marca : ""}${form.modelo ? " " + form.modelo : ""}`;
      const linkSeguimiento = `${window.location.origin}/${slug}/seguimiento/${state.numero_orden}?token=${state.acceso_token}`;
      const mensaje = mensajeIngreso(
        form.cliente_nombre || "cliente",
        equipoNombre,
        state.numero_orden,
        linkSeguimiento,
      );
      window.open(buildWhatsAppLink(telefono, mensaje), "_blank");
    }
    router.push(`/${slug}/reparaciones/${state.id}`);
  }, [state, slug, form, router]);

  return (
    <div className="mx-auto max-w-2xl p-4">
      {/* ENCABEZADO */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          className="text-xl text-muted-foreground hover:text-foreground"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Reparación</h1>
          <p className="text-sm text-muted-foreground">
            Ingreso de equipo al taller
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="slug" value={slug} />

        {/* CLIENTE */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">👤 Cliente</h2>

          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar cliente existente o escribir nombre nuevo..."
              aria-label="Buscar o crear cliente"
              value={clienteBusqueda}
              onChange={(e) => {
                setClienteBusqueda(e.target.value);
                setMostrarDropdown(true);
                if (!e.target.value) limpiarCliente();
              }}
              onFocus={() => setMostrarDropdown(true)}
            />

            {/* Dropdown clientes */}
            {mostrarDropdown &&
              clienteBusqueda &&
              clientesFiltrados.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {clientesFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => seleccionarCliente(c)}
                      className="w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent/10"
                    >
                      <span className="font-medium">{c.nombre}</span>
                      <span className="ml-2 text-muted-foreground">
                        {c.telefono}
                      </span>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* Si es cliente nuevo, mostrar campo teléfono */}
          {clienteBusqueda && !form.cliente_id && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-accent">
                ✨ Cliente nuevo — se creará automáticamente
              </p>
              <Input
                type="tel"
                placeholder="Teléfono / WhatsApp"
                aria-label="Teléfono o WhatsApp del cliente nuevo"
                value={form.cliente_telefono}
                onChange={(e) => {
                  setCampo("cliente_telefono", e.target.value);
                  setCampo("cliente_nombre", clienteBusqueda);
                }}
              />
            </div>
          )}

          <input type="hidden" name="cliente_id" value={form.cliente_id} />
          <input
            type="hidden"
            name="cliente_nombre"
            value={form.cliente_nombre}
          />
          <input
            type="hidden"
            name="cliente_telefono"
            value={form.cliente_telefono}
          />

          {/* Cliente seleccionado */}
          {form.cliente_id && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2">
              <span className="text-sm font-medium text-accent">
                ✓ {form.cliente_nombre} · {form.cliente_telefono}
              </span>
              <button
                type="button"
                onClick={limpiarCliente}
                aria-label="Cambiar cliente"
                className="text-xs text-accent/80 hover:text-accent"
              >
                cambiar
              </button>
            </div>
          )}
        </div>

        {/* EQUIPO */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">💻 Equipo</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label
                htmlFor="categoria"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Categoría *
              </label>
              <select
                name="categoria"
                id="categoria"
                required
                value={form.categoria}
                onChange={(e) => setCampo("categoria", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Seleccioná una categoría...</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="marca"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Marca
              </label>
              <Input
                type="text"
                name="marca"
                id="marca"
                placeholder="ej: Samsung, HP, Sony"
                value={form.marca}
                onChange={(e) => setCampo("marca", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="modelo"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Modelo
              </label>
              <Input
                type="text"
                name="modelo"
                id="modelo"
                placeholder="ej: Galaxy A54, Pavilion"
                value={form.modelo}
                onChange={(e) => setCampo("modelo", e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="numero-serie"
                className="mb-1 block text-xs text-muted-foreground"
              >
                N° de Serie / IMEI
              </label>
              <Input
                type="text"
                name="numero_serie"
                id="numero-serie"
                placeholder="Opcional"
                value={form.numero_serie}
                onChange={(e) => setCampo("numero_serie", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* PROBLEMA */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">🔍 Problema reportado</h2>

          <textarea
            name="problema_reportado"
            required
            placeholder="Describí el problema que reporta el cliente..."
            aria-label="Problema reportado"
            value={form.problema_reportado}
            onChange={(e) => setCampo("problema_reportado", e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />

          <div className="mt-3">
            <label
              htmlFor="accesorios"
              className="mb-1 block text-xs text-muted-foreground"
            >
              Accesorios entregados
            </label>
            <Input
              type="text"
              name="accesorios"
              id="accesorios"
              placeholder="ej: cargador, funda, caja original"
              value={form.accesorios}
              onChange={(e) => setCampo("accesorios", e.target.value)}
            />
          </div>
        </div>

        {/* OPCIONALES */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">⚙️ Datos adicionales</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tecnico-asignado"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Técnico asignado
              </label>
              <Input
                type="text"
                name="tecnico_asignado"
                id="tecnico-asignado"
                placeholder="Opcional"
                value={form.tecnico_asignado}
                onChange={(e) => setCampo("tecnico_asignado", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="fecha-estimada"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Entrega estimada
              </label>
              <Input
                type="date"
                name="fecha_estimada_entrega"
                id="fecha-estimada"
                value={form.fecha_estimada_entrega}
                onChange={(e) =>
                  setCampo("fecha_estimada_entrega", e.target.value)
                }
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="notas-internas"
                className="mb-1 block text-xs text-muted-foreground"
              >
                Notas internas
              </label>
              <textarea
                name="observaciones_internas"
                id="notas-internas"
                placeholder="Notas solo visibles para el técnico..."
                value={form.observaciones_internas}
                onChange={(e) =>
                  setCampo("observaciones_internas", e.target.value)
                }
                rows={2}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>

        {/* Error de la acción */}
        {!state.ok && state.error && (
          <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        {/* BOTÓN GUARDAR */}
        <Button
          type="submit"
          disabled={pending}
          variant="accent"
          className="h-auto w-full rounded-xl py-3 text-lg font-semibold"
        >
          {pending ? "Guardando..." : "✅ Registrar equipo y enviar WhatsApp"}
        </Button>

        <p className="pb-6 text-center text-xs text-muted-foreground">
          Al guardar se abrirá WhatsApp automáticamente con el mensaje de
          confirmación para el cliente.
        </p>
      </form>
    </div>
  );
}
