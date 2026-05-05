'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ESTADOS = [
  { valor: 'recibido', etiqueta: 'Recibido', color: 'bg-gray-100 text-gray-700' },
  { valor: 'en_diagnostico', etiqueta: 'En diagnóstico', color: 'bg-blue-100 text-blue-700' },
  { valor: 'presupuesto_enviado', etiqueta: 'Presupuesto enviado', color: 'bg-yellow-100 text-yellow-700' },
  { valor: 'aprobado', etiqueta: 'Aprobado', color: 'bg-cyan-100 text-cyan-700' },
  { valor: 'en_reparacion', etiqueta: 'En reparación', color: 'bg-purple-100 text-purple-700' },
  { valor: 'listo_para_retirar', etiqueta: 'Listo para retirar', color: 'bg-green-100 text-green-700' },
  { valor: 'entregado', etiqueta: 'Entregado', color: 'bg-green-200 text-green-800' },
  { valor: 'sin_reparacion', etiqueta: 'Sin reparación', color: 'bg-red-100 text-red-700' },
]

const ESTADOS_CONTADORES = ['recibido', 'en_reparacion', 'listo_para_retirar', 'entregado']

export default function ReparacionesPage() {
  const params = useParams()
  const slug = params.slug as string
  const [negocioId, setNegocioId] = useState('')
  const [equipos, setEquipos] = useState<any[]>([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [slug])

  async function cargarDatos() {
    setCargando(true)
    const { data: negocio } = await supabase.from('negocios').select('id').eq('slug', slug).single()
    if (!negocio) { setCargando(false); return }
    setNegocioId(negocio.id)
    const { data } = await supabase
      .from('equipos')
      .select('*, clientes(nombre, telefono)')
      .eq('negocio_id', negocio.id)
      .order('created_at', { ascending: false })
    setEquipos(data || [])
    setCargando(false)
  }

  const equiposFiltrados = equipos.filter(e => {
    const coincideEstado = filtroEstado === 'todos' || e.estado === filtroEstado
    const coincideBusqueda = busqueda === '' ||
      e.numero_orden?.toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.clientes?.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.marca || '').toLowerCase().includes(busqueda.toLowerCase())
    return coincideEstado && coincideBusqueda
  })

  function contarEstado(estado: string) { return equipos.filter(e => e.estado === estado).length }
  function diasEnTaller(f: string) { return Math.floor((Date.now() - new Date(f).getTime()) / 86400000) }
  function colorDias(d: number) { return d <= 3 ? 'text-green-600' : d <= 7 ? 'text-yellow-600' : 'text-red-600 font-bold' }

  if (cargando) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔧 Reparaciones</h1>
          <p className="text-gray-500 text-sm">{equipos.length} equipos en total</p>
        </div>
        <a href={"/" + slug + "/reparaciones/nuevo"} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
          + Nueva reparación
        </a>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {ESTADOS_CONTADORES.map(val => {
          const est = ESTADOS.find(e => e.valor === val)!
          return (
            <button key={val} onClick={() => setFiltroEstado(filtroEstado === val ? 'todos' : val)}
              className={"rounded-xl p-3 text-center border-2 transition " + (filtroEstado === val ? 'border-blue-500 shadow-md ' : 'border-transparent ') + est.color}>
              <div className="text-2xl font-bold">{contarEstado(val)}</div>
              <div className="text-xs mt-1 leading-tight">{est.etiqueta}</div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Buscar por N° orden, cliente, marca..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
        </select>
      </div>

      {equiposFiltrados.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          {equipos.length === 0 ? '¡Todavía no hay reparaciones! Ingresá la primera.' : 'No hay equipos que coincidan.'}
        </div>
      ) : (
        <div className="space-y-2">
          {equiposFiltrados.map(equipo => {
            const estadoInfo = ESTADOS.find(e => e.valor === equipo.estado)
            const dias = diasEnTaller(equipo.fecha_ingreso)
            return (
              <a key={equipo.id} href={"/" + slug + "/reparaciones/" + equipo.id}
                className="block bg-white border rounded-xl p-4 hover:shadow-md transition hover:border-blue-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-700 text-sm">{equipo.numero_orden}</span>
                      <span className={"text-xs px-2 py-0.5 rounded-full " + estadoInfo?.color}>{estadoInfo?.etiqueta}</span>
                      {equipo.estado === 'listo_para_retirar' && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">¡Listo!</span>
                      )}
                    </div>
                    <div className="mt-1 text-gray-800 font-medium">
                      {equipo.categoria}{equipo.marca ? ' · ' + equipo.marca : ''}{equipo.modelo ? ' ' + equipo.modelo : ''}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      👤 {equipo.clientes?.nombre || 'Sin cliente'}
                      {equipo.tecnico_asignado ? ' · 🔧 ' + equipo.tecnico_asignado : ''}
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5 truncate">{equipo.problema_reportado}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={"text-sm " + colorDias(dias)}>{dias === 0 ? 'Hoy' : dias + 'd'}</div>
                    {equipo.precio_final && (
                      <div className="text-sm font-bold text-gray-700 mt-1">${Number(equipo.precio_final).toLocaleString('es-AR')}</div>
                    )}
                    {equipo.presupuesto && !equipo.precio_final && (
                      <div className="text-sm text-yellow-600 mt-1">${Number(equipo.presupuesto).toLocaleString('es-AR')}</div>
                    )}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}