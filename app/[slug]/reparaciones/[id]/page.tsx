'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ESTADOS = [
  { valor: 'recibido', etiqueta: 'Recibido', color: 'bg-gray-100 text-gray-700' },
  { valor: 'en_diagnostico', etiqueta: 'En diagnóstico', color: 'bg-blue-100 text-blue-700' },
  { valor: 'presupuesto_enviado', etiqueta: 'Presupuesto enviado', color: 'bg-yellow-100 text-yellow-700' },
  { valor: 'esperando_aprobacion', etiqueta: 'Esperando aprobación', color: 'bg-orange-100 text-orange-700' },
  { valor: 'aprobado', etiqueta: 'Aprobado', color: 'bg-cyan-100 text-cyan-700' },
  { valor: 'en_reparacion', etiqueta: 'En reparación', color: 'bg-purple-100 text-purple-700' },
  { valor: 'listo_para_retirar', etiqueta: 'Listo para retirar', color: 'bg-green-100 text-green-700' },
  { valor: 'entregado', etiqueta: 'Entregado', color: 'bg-green-200 text-green-800' },
  { valor: 'sin_reparacion', etiqueta: 'Sin reparación', color: 'bg-red-100 text-red-700' },
]

export default function DetalleReparacionPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const id = params.id as string
  // Evitar que "nuevo" sea tratado como un ID
  if (id === 'nuevo') {
    router.push('/' + slug + '/reparaciones/nuevo')
    return null
  }  
  const [equipo, setEquipo] = useState<any>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const [repuestos, setRepuestos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  // Cambio de estado
  const [mostrarCambioEstado, setMostrarCambioEstado] = useState(false)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [comentarioCambio, setComentarioCambio] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  // Presupuesto
  const [mostrarPresupuesto, setMostrarPresupuesto] = useState(false)
  const [montoPresupuesto, setMontoPresupuesto] = useState('')
  const [guardandoPresupuesto, setGuardandoPresupuesto] = useState(false)

  // Repuesto nuevo
  const [mostrarRepuesto, setMostrarRepuesto] = useState(false)
  const [nuevoRepuesto, setNuevoRepuesto] = useState({ descripcion: '', costo: '', precio_cobrado: '', cantidad: '1' })
  const [guardandoRepuesto, setGuardandoRepuesto] = useState(false)

  // Precio final
  const [mostrarPrecioFinal, setMostrarPrecioFinal] = useState(false)
  const [precioCobrado, setPrecioCobrado] = useState('')

  useEffect(() => { cargarDatos() }, [id])

  async function cargarDatos() {
    setCargando(true)
    const { data: eq } = await supabase
      .from('equipos')
      .select('*, clientes(nombre, telefono)')
      .eq('id', id)
      .single()
    setEquipo(eq)

    const { data: hist } = await supabase
      .from('reparaciones_historial')
      .select('*')
      .eq('equipo_id', id)
      .order('fecha', { ascending: false })
    setHistorial(hist || [])

    const { data: reps } = await supabase
      .from('reparaciones_repuestos')
      .select('*')
      .eq('equipo_id', id)
    setRepuestos(reps || [])

    setCargando(false)
  }

  async function cambiarEstado() {
    if (!nuevoEstado) return alert('Seleccioná un estado')
    setGuardandoEstado(true)
    await supabase.from('equipos').update({ estado: nuevoEstado }).eq('id', id)
    await supabase.from('reparaciones_historial').insert({
      equipo_id: id,
      negocio_id: equipo.negocio_id,
      estado_anterior: equipo.estado,
      estado_nuevo: nuevoEstado,
      comentario: comentarioCambio || null,
      usuario: 'técnico',
    })
    setMostrarCambioEstado(false)
    setNuevoEstado('')
    setComentarioCambio('')
    setGuardandoEstado(false)
    await cargarDatos()

    // WhatsApp automático para estados clave
    const tel = equipo.clientes?.telefono
    const nombre = equipo.clientes?.nombre || 'cliente'
    const equipoNombre = equipo.categoria + (equipo.marca ? ' ' + equipo.marca : '')
    if (tel) {
      let msg = ''
      if (nuevoEstado === 'listo_para_retirar') {
        const precio = equipo.precio_final || equipo.presupuesto || 0
        msg = `Hola ${nombre}, ¡tu ${equipoNombre} ya está listo! Podés pasar a retirarlo. Total a abonar: $${Number(precio).toLocaleString('es-AR')}. ¡Hasta pronto!`
      } else if (nuevoEstado === 'sin_reparacion') {
        msg = `Hola ${nombre}, lamentablemente no pudimos reparar tu ${equipoNombre}. Podés pasar a retirarlo sin costo. Disculpá los inconvenientes.`
      }
      if (msg) {
        const telLimpio = tel.replace(/\D/g, '')
        window.open('https://wa.me/549' + telLimpio + '?text=' + encodeURIComponent(msg), '_blank')
      }
    }
  }

  async function guardarPresupuesto() {
    if (!montoPresupuesto) return alert('Ingresá un monto')
    setGuardandoPresupuesto(true)
    await supabase.from('equipos').update({
      presupuesto: parseFloat(montoPresupuesto),
      estado: 'presupuesto_enviado'
    }).eq('id', id)
    await supabase.from('reparaciones_historial').insert({
      equipo_id: id,
      negocio_id: equipo.negocio_id,
      estado_anterior: equipo.estado,
      estado_nuevo: 'presupuesto_enviado',
      comentario: 'Presupuesto cargado: $' + montoPresupuesto,
      usuario: 'técnico',
    })

    // Abrir WhatsApp con presupuesto
    const tel = equipo.clientes?.telefono
    const nombre = equipo.clientes?.nombre || 'cliente'
    const equipoNombre = equipo.categoria + (equipo.marca ? ' ' + equipo.marca : '')
    if (tel) {
      const msg = `Hola ${nombre}, ya tenemos el diagnóstico de tu ${equipoNombre}. El presupuesto es de *$${Number(montoPresupuesto).toLocaleString('es-AR')}*. ¿Lo aprobamos y arrancamos con la reparación?`
      const telLimpio = tel.replace(/\D/g, '')
      window.open('https://wa.me/549' + telLimpio + '?text=' + encodeURIComponent(msg), '_blank')
    }

    setMostrarPresupuesto(false)
    setMontoPresupuesto('')
    setGuardandoPresupuesto(false)
    await cargarDatos()
  }

  async function agregarRepuesto() {
    if (!nuevoRepuesto.descripcion) return alert('Ingresá una descripción')
    setGuardandoRepuesto(true)
    await supabase.from('reparaciones_repuestos').insert({
      equipo_id: id,
      negocio_id: equipo.negocio_id,
      descripcion: nuevoRepuesto.descripcion,
      costo: parseFloat(nuevoRepuesto.costo) || 0,
      precio_cobrado: parseFloat(nuevoRepuesto.precio_cobrado) || 0,
      cantidad: parseInt(nuevoRepuesto.cantidad) || 1,
    })
    setNuevoRepuesto({ descripcion: '', costo: '', precio_cobrado: '', cantidad: '1' })
    setMostrarRepuesto(false)
    setGuardandoRepuesto(false)
    await cargarDatos()
  }

  async function eliminarRepuesto(repId: string) {
    if (!confirm('¿Eliminár este repuesto?')) return
    await supabase.from('reparaciones_repuestos').delete().eq('id', repId)
    await cargarDatos()
  }

  async function marcarEntregado() {
    if (!precioCobrado) return alert('Ingresá el precio final cobrado')
    await supabase.from('equipos').update({
      estado: 'entregado',
      precio_final: parseFloat(precioCobrado),
      fecha_entrega: new Date().toISOString(),
    }).eq('id', id)
    await supabase.from('reparaciones_historial').insert({
      equipo_id: id,
      negocio_id: equipo.negocio_id,
      estado_anterior: equipo.estado,
      estado_nuevo: 'entregado',
      comentario: 'Equipo entregado. Cobrado: $' + precioCobrado,
      usuario: 'técnico',
    })
    setMostrarPrecioFinal(false)
    setPrecioCobrado('')
    await cargarDatos()
  }

  function formatFecha(f: string) {
    return new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const totalRepuestos = repuestos.reduce((acc, r) => acc + (r.precio_cobrado * r.cantidad), 0)
  const estadoInfo = ESTADOS.find(e => e.valor === equipo?.estado)

  if (cargando) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
  if (!equipo) return <div className="flex items-center justify-center h-64 text-gray-400">Reparación no encontrada.</div>

  return (
    <div className="p-4 max-w-2xl mx-auto pb-16">

      {/* ENCABEZADO */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-blue-700">{equipo.numero_orden}</span>
            <span className={"text-xs px-2 py-1 rounded-full " + estadoInfo?.color}>{estadoInfo?.etiqueta}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {equipo.categoria}{equipo.marca ? ' · ' + equipo.marca : ''}{equipo.modelo ? ' ' + equipo.modelo : ''}
          </p>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <h2 className="font-semibold text-gray-700 mb-2">👤 Cliente</h2>
        <p className="font-medium text-gray-800">{equipo.clientes?.nombre || 'Sin cliente'}</p>
        {equipo.clientes?.telefono && (
          <a href={"https://wa.me/549" + equipo.clientes.telefono.replace(/\D/g, '')}
            target="_blank"
            className="text-green-600 text-sm hover:underline">
            📱 {equipo.clientes.telefono}
          </a>
        )}
      </div>

      {/* EQUIPO */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <h2 className="font-semibold text-gray-700 mb-2">💻 Equipo</h2>
        <div className="grid grid-cols-2 gap-1 text-sm">
          <span className="text-gray-500">Categoría</span><span className="text-gray-800">{equipo.categoria}</span>
          {equipo.marca && <><span className="text-gray-500">Marca</span><span className="text-gray-800">{equipo.marca}</span></>}
          {equipo.modelo && <><span className="text-gray-500">Modelo</span><span className="text-gray-800">{equipo.modelo}</span></>}
          {equipo.numero_serie && <><span className="text-gray-500">N° Serie</span><span className="text-gray-800">{equipo.numero_serie}</span></>}
          {equipo.accesorios && <><span className="text-gray-500">Accesorios</span><span className="text-gray-800">{equipo.accesorios}</span></>}
          {equipo.tecnico_asignado && <><span className="text-gray-500">Técnico</span><span className="text-gray-800">{equipo.tecnico_asignado}</span></>}
          <span className="text-gray-500">Ingreso</span><span className="text-gray-800">{formatFecha(equipo.fecha_ingreso)}</span>
          {equipo.fecha_estimada_entrega && <><span className="text-gray-500">Entrega est.</span><span className="text-gray-800">{equipo.fecha_estimada_entrega}</span></>}
        </div>
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">Problema reportado</p>
          <p className="text-sm text-gray-800">{equipo.problema_reportado}</p>
        </div>
        {equipo.observaciones_internas && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Notas internas</p>
            <p className="text-sm text-gray-600 italic">{equipo.observaciones_internas}</p>
          </div>
        )}
      </div>

      {/* PRESUPUESTO Y PRECIO */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <h2 className="font-semibold text-gray-700 mb-3">💰 Presupuesto y cobro</h2>
        <div className="flex gap-3 flex-wrap">
          {equipo.presupuesto && (
            <div className="bg-yellow-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Presupuesto</p>
              <p className="font-bold text-yellow-700">${Number(equipo.presupuesto).toLocaleString('es-AR')}</p>
            </div>
          )}
          {totalRepuestos > 0 && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Repuestos</p>
              <p className="font-bold text-blue-700">${totalRepuestos.toLocaleString('es-AR')}</p>
            </div>
          )}
          {equipo.precio_final && (
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Cobrado</p>
              <p className="font-bold text-green-700">${Number(equipo.precio_final).toLocaleString('es-AR')}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {!equipo.presupuesto && (
            <button onClick={() => setMostrarPresupuesto(true)}
              className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition">
              + Cargar presupuesto
            </button>
          )}
          {equipo.estado === 'listo_para_retirar' && !equipo.precio_final && (
            <button onClick={() => setMostrarPrecioFinal(true)}
              className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition">
              ✓ Marcar entregado y cobrado
            </button>
          )}
        </div>

        {/* Form presupuesto */}
        {mostrarPresupuesto && (
          <div className="mt-3 pt-3 border-t flex gap-2">
            <input type="number" placeholder="Monto $" value={montoPresupuesto}
              onChange={e => setMontoPresupuesto(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <button onClick={guardarPresupuesto} disabled={guardandoPresupuesto}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition disabled:opacity-50">
              {guardandoPresupuesto ? '...' : 'Enviar por WA'}
            </button>
            <button onClick={() => setMostrarPresupuesto(false)} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        )}

        {/* Form precio final */}
        {mostrarPrecioFinal && (
          <div className="mt-3 pt-3 border-t flex gap-2">
            <input type="number" placeholder="Precio final cobrado $" value={precioCobrado}
              onChange={e => setPrecioCobrado(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <button onClick={marcarEntregado}
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition">
              Confirmar
            </button>
            <button onClick={() => setMostrarPrecioFinal(false)} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        )}
      </div>

      {/* REPUESTOS */}
      <div className="bg-white border rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">🔩 Repuestos utilizados</h2>
          <button onClick={() => setMostrarRepuesto(!mostrarRepuesto)}
            className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition">
            + Agregar
          </button>
        </div>

        {mostrarRepuesto && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <input type="text" placeholder="Descripción del repuesto *" value={nuevoRepuesto.descripcion}
              onChange={e => setNuevoRepuesto(r => ({ ...r, descripcion: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="Costo $" value={nuevoRepuesto.costo}
                onChange={e => setNuevoRepuesto(r => ({ ...r, costo: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input type="number" placeholder="Precio cobrado $" value={nuevoRepuesto.precio_cobrado}
                onChange={e => setNuevoRepuesto(r => ({ ...r, precio_cobrado: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input type="number" placeholder="Cant." value={nuevoRepuesto.cantidad}
                onChange={e => setNuevoRepuesto(r => ({ ...r, cantidad: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <button onClick={agregarRepuesto} disabled={guardandoRepuesto}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
              {guardandoRepuesto ? 'Guardando...' : 'Guardar repuesto'}
            </button>
          </div>
        )}

        {repuestos.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin repuestos cargados.</p>
        ) : (
          <div className="space-y-2">
            {repuestos.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div>
                  <span className="font-medium text-gray-800">{r.descripcion}</span>
                  {r.cantidad > 1 && <span className="text-gray-400 ml-1">x{r.cantidad}</span>}
                  <div className="text-xs text-gray-400">
                    Costo: ${Number(r.costo).toLocaleString('es-AR')} · Cobrado: ${Number(r.precio_cobrado).toLocaleString('es-AR')}
                  </div>
                </div>
                <button onClick={() => eliminarRepuesto(r.id)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CAMBIAR ESTADO */}
      {equipo.estado !== 'entregado' && (
        <div className="bg-white border rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-700">🔄 Cambiar estado</h2>
            <button onClick={() => setMostrarCambioEstado(!mostrarCambioEstado)}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition">
              {mostrarCambioEstado ? 'Cancelar' : 'Cambiar'}
            </button>
          </div>

          {mostrarCambioEstado && (
            <div className="space-y-2">
              <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Seleccioná el nuevo estado...</option>
                {ESTADOS.filter(e => e.valor !== equipo.estado).map(e => (
                  <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                ))}
              </select>
              <textarea placeholder="Comentario (opcional)..." value={comentarioCambio}
                onChange={e => setComentarioCambio(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              <button onClick={cambiarEstado} disabled={guardandoEstado}
                className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {guardandoEstado ? 'Guardando...' : 'Confirmar cambio de estado'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* HISTORIAL */}
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold text-gray-700 mb-3">📋 Historial</h2>
        {historial.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin historial.</p>
        ) : (
          <div className="space-y-3">
            {historial.map(h => {
              const est = ESTADOS.find(e => e.valor === h.estado_nuevo)
              return (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                    <div className="w-0.5 bg-gray-200 flex-1 mt-1"></div>
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={"text-xs px-2 py-0.5 rounded-full " + est?.color}>{est?.etiqueta}</span>
                      <span className="text-xs text-gray-400">{formatFecha(h.fecha)}</span>
                    </div>
                    {h.comentario && <p className="text-sm text-gray-600 mt-1">{h.comentario}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}