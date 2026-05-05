'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CATEGORIAS_EQUIPO, MENSAJES_WHATSAPP } from '@/lib/types-reparaciones'

interface Cliente {
  id: string
  nombre: string
  telefono: string
}

export default function NuevaReparacionPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [guardando, setGuardando] = useState(false)
  const [clienteBusqueda, setClienteBusqueda] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '',
    cliente_nombre: '',
    cliente_telefono: '',
    categoria: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    problema_reportado: '',
    accesorios: '',
    tecnico_asignado: '',
    fecha_estimada_entrega: '',
    observaciones_internas: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [slug])

  async function cargarDatos() {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, nombre')
      .eq('slug', slug)
      .single()

    if (!negocio) return
    setNegocioId(negocio.id)
    setNegocioNombre(negocio.nombre)

    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nombre, telefono')
      .eq('negocio_id', negocio.id)
      .order('nombre')

    setClientes(clientesData || [])
  }

  function seleccionarCliente(cliente: Cliente) {
    setForm(f => ({
      ...f,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
    }))
    setClienteBusqueda(cliente.nombre)
    setMostrarDropdown(false)
  }

  function limpiarCliente() {
    setForm(f => ({ ...f, cliente_id: '', cliente_nombre: '', cliente_telefono: '' }))
    setClienteBusqueda('')
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()) ||
    c.telefono.includes(clienteBusqueda)
  )

  async function guardar() {
    if (!negocioId) return
    if (!form.categoria) return alert('Seleccioná una categoría')
    if (!form.problema_reportado.trim()) return alert('Describí el problema')
    if (!form.cliente_id && !form.cliente_nombre.trim()) return alert('Ingresá un cliente')

    setGuardando(true)

    try {
      // 1. Si es cliente nuevo, crearlo primero
      let clienteId = form.cliente_id

      if (!clienteId && form.cliente_nombre.trim()) {
        const { data: nuevoCliente, error } = await supabase
          .from('clientes')
          .insert({
            negocio_id: negocioId,
            nombre: form.cliente_nombre.trim(),
            telefono: form.cliente_telefono.trim(),
            estado: 'activo',
          })
          .select()
          .single()

        if (error) throw error
        clienteId = nuevoCliente.id
      }

      // 2. Generar número de orden
      const { data: ordenData } = await supabase
        .rpc('generar_numero_orden', { p_negocio_id: negocioId })

      const numeroOrden = ordenData as string

      // 3. Crear el equipo
      const { data: equipo, error: errorEquipo } = await supabase
        .from('equipos')
        .insert({
          negocio_id: negocioId,
          cliente_id: clienteId,
          numero_orden: numeroOrden,
          categoria: form.categoria,
          marca: form.marca.trim() || null,
          modelo: form.modelo.trim() || null,
          numero_serie: form.numero_serie.trim() || null,
          problema_reportado: form.problema_reportado.trim(),
          accesorios: form.accesorios.trim() || null,
          tecnico_asignado: form.tecnico_asignado.trim() || null,
          fecha_estimada_entrega: form.fecha_estimada_entrega || null,
          observaciones_internas: form.observaciones_internas.trim() || null,
          estado: 'recibido',
        })
        .select()
        .single()

      if (errorEquipo) throw errorEquipo

      // 4. Registrar primer historial
      await supabase.from('reparaciones_historial').insert({
        equipo_id: equipo.id,
        negocio_id: negocioId,
        estado_anterior: null,
        estado_nuevo: 'recibido',
        comentario: 'Equipo ingresado al taller',
        usuario: 'sistema',
      })

      // 5. Abrir WhatsApp si hay teléfono
      const telefono = form.cliente_telefono.trim()
      if (telefono) {
        const equipoNombre = `${form.categoria}${form.marca ? ' ' + form.marca : ''}${form.modelo ? ' ' + form.modelo : ''}`
        const linkSeguimiento = `${window.location.origin}/${slug}/seguimiento/${numeroOrden}`
        const mensaje = MENSAJES_WHATSAPP.ingreso(
          form.cliente_nombre || 'cliente',
          equipoNombre,
          numeroOrden,
          linkSeguimiento
        )
        const telLimpio = telefono.replace(/\D/g, '')
        const waUrl = `https://wa.me/549${telLimpio}?text=${encodeURIComponent(mensaje)}`
        window.open(waUrl, '_blank')
      }

      // 6. Redirigir al detalle
      router.push(`/${slug}/reparaciones/${equipo.id}`)
    } catch (err) {
      console.error(err)
      alert('Error al guardar. Revisá la consola.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">

      {/* ENCABEZADO */}
      <div className="flex items-center gap-3 mb-6">
        <button
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

      <div className="space-y-5">

        {/* CLIENTE */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">👤 Cliente</h2>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente existente o escribir nombre nuevo..."
              value={clienteBusqueda}
              onChange={e => {
                setClienteBusqueda(e.target.value)
                setMostrarDropdown(true)
                if (!e.target.value) limpiarCliente()
              }}
              onFocus={() => setMostrarDropdown(true)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Dropdown clientes */}
            {mostrarDropdown && clienteBusqueda && clientesFiltrados.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {clientesFiltrados.map(c => (
                  <button
                    key={c.id}
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
                onChange={e => setForm(f => ({ ...f, cliente_telefono: e.target.value, cliente_nombre: clienteBusqueda }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          {/* Cliente seleccionado */}
          {form.cliente_id && (
            <div className="mt-2 flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
              <span className="text-sm text-blue-700 font-medium">
                ✓ {form.cliente_nombre} · {form.cliente_telefono}
              </span>
              <button onClick={limpiarCliente} className="text-blue-400 hover:text-blue-600 text-xs">
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
              <label className="text-xs text-gray-500 mb-1 block">Categoría *</label>
              <select
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Seleccioná una categoría...</option>
                {CATEGORIAS_EQUIPO.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Marca</label>
              <input
                type="text"
                placeholder="ej: Samsung, HP, Sony"
                value={form.marca}
                onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Modelo</label>
              <input
                type="text"
                placeholder="ej: Galaxy A54, Pavilion"
                value={form.modelo}
                onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">N° de Serie / IMEI</label>
              <input
                type="text"
                placeholder="Opcional"
                value={form.numero_serie}
                onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        </div>

        {/* PROBLEMA */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">🔍 Problema reportado</h2>

          <textarea
            placeholder="Describí el problema que reporta el cliente..."
            value={form.problema_reportado}
            onChange={e => setForm(f => ({ ...f, problema_reportado: e.target.value }))}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />

          <div className="mt-3">
            <label className="text-xs text-gray-500 mb-1 block">Accesorios entregados</label>
            <input
              type="text"
              placeholder="ej: cargador, funda, caja original"
              value={form.accesorios}
              onChange={e => setForm(f => ({ ...f, accesorios: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* OPCIONALES */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">⚙️ Datos adicionales</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Técnico asignado</label>
              <input
                type="text"
                placeholder="Opcional"
                value={form.tecnico_asignado}
                onChange={e => setForm(f => ({ ...f, tecnico_asignado: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Entrega estimada</label>
              <input
                type="date"
                value={form.fecha_estimada_entrega}
                onChange={e => setForm(f => ({ ...f, fecha_estimada_entrega: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas internas</label>
              <textarea
                placeholder="Notas solo visibles para el técnico..."
                value={form.observaciones_internas}
                onChange={e => setForm(f => ({ ...f, observaciones_internas: e.target.value }))}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* BOTÓN GUARDAR */}
        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : '✅ Registrar equipo y enviar WhatsApp'}
        </button>

        <p className="text-center text-xs text-gray-400 pb-6">
          Al guardar se abrirá WhatsApp automáticamente con el mensaje de confirmación para el cliente.
        </p>

      </div>
    </div>
  )
}