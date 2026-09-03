// features/reparaciones/components/NuevaReparacionForm.tsx
//
// Alta de reparación (client component). El formulario envía los datos a la
// Server Action `crearReparacion` (R9); al confirmarse abre WhatsApp con el
// mensaje de ingreso (lib/domain/mensajes + wa.ts, R3/R4) y navega al
// detalle. Clientes y categorías llegan como props desde el Server Component
// (R8): el cliente nuevo se crea dentro de la acción.

"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { crearReparacion } from "@/features/reparaciones/actions/reparaciones";
import type { CrearReparacionResult } from "@/features/reparaciones/actions/reparaciones";
import { mensajeIngreso } from "@/lib/domain/mensajes";
import { buildWhatsAppLink } from "@/lib/domain/wa";
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
    <div className="p-4 max-w-2xl mx-auto">
      {/* ENCABEZADO */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nueva Reparación</h1>
          <p className="text-gray-400 text-sm">Ingreso de equipo al taller</p>
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="slug" value={slug} />

        {/* CLIENTE */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">👤 Cliente</h2>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente existente o escribir nombre nuevo..."
              value={clienteBusqueda}
              onChange={(e) => {
                setClienteBusqueda(e.target.value);
                setMostrarDropdown(true);
                if (!e.target.value) limpiarCliente();
              }}
              onFocus={() => setMostrarDropdown(true)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Dropdown clientes */}
            {mostrarDropdown &&
              clienteBusqueda &&
              clientesFiltrados.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {clientesFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => seleccionarCliente(c)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0"
                    >
                      <span className="font-medium">{c.nombre}</span>
                      <span className="text-gray-400 ml-2">{c.telefono}</span>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* Si es cliente nuevo, mostrar campo teléfono */}
          {clienteBusqueda && !form.cliente_id && (
            <div className="mt-3">
              <p className="text-xs text-blue-600 mb-2">
                ✨ Cliente nuevo — se creará automáticamente
              </p>
              <input
                type="tel"
                placeholder="Teléfono / WhatsApp"
                value={form.cliente_telefono}
                onChange={(e) => {
                  setCampo("cliente_telefono", e.target.value);
                  setCampo("cliente_nombre", clienteBusqueda);
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
            <div className="mt-2 flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
              <span className="text-sm text-blue-700 font-medium">
                ✓ {form.cliente_nombre} · {form.cliente_telefono}
              </span>
              <button
                type="button"
                onClick={limpiarCliente}
                className="text-blue-400 hover:text-blue-600 text-xs"
              >
                cambiar
              </button>
            </div>
          )}
        </div>

        {/* EQUIPO */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">💻 Equipo</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">
                Categoría *
              </label>
              <select
                name="categoria"
                required
                value={form.categoria}
                onChange={(e) => setCampo("categoria", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              <label className="text-xs text-gray-500 mb-1 block">Marca</label>
              <input
                type="text"
                name="marca"
                placeholder="ej: Samsung, HP, Sony"
                value={form.marca}
                onChange={(e) => setCampo("marca", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Modelo</label>
              <input
                type="text"
                name="modelo"
                placeholder="ej: Galaxy A54, Pavilion"
                value={form.modelo}
                onChange={(e) => setCampo("modelo", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">
                N° de Serie / IMEI
              </label>
              <input
                type="text"
                name="numero_serie"
                placeholder="Opcional"
                value={form.numero_serie}
                onChange={(e) => setCampo("numero_serie", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        {/* PROBLEMA */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">
            🔍 Problema reportado
          </h2>

          <textarea
            name="problema_reportado"
            required
            placeholder="Describí el problema que reporta el cliente..."
            value={form.problema_reportado}
            onChange={(e) => setCampo("problema_reportado", e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />

          <div className="mt-3">
            <label className="text-xs text-gray-500 mb-1 block">
              Accesorios entregados
            </label>
            <input
              type="text"
              name="accesorios"
              placeholder="ej: cargador, funda, caja original"
              value={form.accesorios}
              onChange={(e) => setCampo("accesorios", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* OPCIONALES */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">
            ⚙️ Datos adicionales
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Técnico asignado
              </label>
              <input
                type="text"
                name="tecnico_asignado"
                placeholder="Opcional"
                value={form.tecnico_asignado}
                onChange={(e) => setCampo("tecnico_asignado", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Entrega estimada
              </label>
              <input
                type="date"
                name="fecha_estimada_entrega"
                value={form.fecha_estimada_entrega}
                onChange={(e) =>
                  setCampo("fecha_estimada_entrega", e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">
                Notas internas
              </label>
              <textarea
                name="observaciones_internas"
                placeholder="Notas solo visibles para el técnico..."
                value={form.observaciones_internas}
                onChange={(e) =>
                  setCampo("observaciones_internas", e.target.value)
                }
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Error de la acción */}
        {!state.ok && state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        {/* BOTÓN GUARDAR */}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {pending ? "Guardando..." : "✅ Registrar equipo y enviar WhatsApp"}
        </button>

        <p className="text-center text-xs text-gray-400 pb-6">
          Al guardar se abrirá WhatsApp automáticamente con el mensaje de
          confirmación para el cliente.
        </p>
      </form>
    </div>
  );
}
