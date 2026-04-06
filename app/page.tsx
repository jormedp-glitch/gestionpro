'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPanel() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [form, setForm] = useState({ nombre: '', slug: '', rubro: 'gimnasio' })
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    const { data } = await supabase.from('negocios').select('*').order('created_at', { ascending: false })
    setNegocios(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const crearNegocio = async () => {
    if (!form.nombre || !form.slug) return alert('Completá nombre y slug')
    await supabase.from('negocios').insert([form])
    setForm({ nombre: '', slug: '', rubro: 'gimnasio' })
    cargar()
  }

  const rubroIcon: any = { gimnasio: '🏋️', peluqueria: '✂️', veterinaria: '🐾' }

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: 'sans-serif', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>⚡ GestiónPro</h1>
        <p style={{ color: '#555', marginBottom: '2rem' }}>Panel de administración</p>
        <div style={{ background: '#13131A', border: '1px solid #ffffff10', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input placeholder="Nombre negocio" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={{ background: '#1E1E28', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '0.65rem 1rem', flex: 1, minWidth: '150px' }} />
            <input placeholder="slug (ej: gym-el-oso)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} style={{ background: '#1E1E28', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '0.65rem 1rem', flex: 1, minWidth: '150px' }} />
            <select value={form.rubro} onChange={e => setForm({ ...form, rubro: e.target.value })} style={{ background: '#1E1E28', border: '1px solid #333', color: '#fff', borderRadius: '8px', padding: '0.65rem 1rem' }}>
              <option value="gimnasio">Gimnasio</option>
              <option value="peluqueria">Peluqueria</option>
              <option value="veterinaria">Veterinaria</option>
            </select>
            <button onClick={crearNegocio} style={{ background: '#FF6B35', color: '#000', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 700 }}>Crear</button>
          </div>
        </div>
        {loading && <p style={{ color: '#444' }}>Cargando...</p>}
        {!loading && negocios.length === 0 && <p style={{ color: '#333', textAlign: 'center', padding: '2rem' }}>No hay negocios. Crea el primero!</p>}
        {negocios.map((n) => (
          <div key={n.id} style={{ background: '#13131A', border: '1px solid #ffffff08', borderRadius: '14px', padding: '1.25rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{rubroIcon[n.rubro]} {n.nombre}</div>
              <div style={{ color: '#444', fontSize: '0.8rem' }}>/{n.slug}</div>
            </div>
            <a href={"/" + n.slug} target="_blank" style={{ background: '#FF6B3520', color: '#FF6B35', border: '1px solid #FF6B3530', padding: '0.45rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem' }}>Abrir app</a>
          </div>
        ))}
      </div>
    </div>
  )
}
