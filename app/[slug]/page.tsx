'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'

export default function NegocioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('negocios')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setNegocio(data)
        setLoading(false)
      })
  }, [slug])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Cargando...</p>
    </div>
  )

  if (!negocio) return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Negocio no encontrado</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{negocio.nombre}</h1>
        <p style={{ color: '#666' }}>{negocio.rubro}</p>
        <p style={{ color: '#444', marginTop: '1rem' }}>Sistema completo próximamente</p>
      </div>
    </div>
  )
}