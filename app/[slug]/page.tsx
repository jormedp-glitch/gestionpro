'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'

export default function NegocioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<any[]>([])
  const [turnos, setTurnos] = useState<any[]>([])
  const [gastos, setGastos] = useState<any[]>([])
  const [vista, setVista] = useState('dashboard')
  const [modal, setModal] = useState<string|null>(null)
  const [modalData, setModalData] = useState<any>({})
  const [toast, setToast] = useState<any>(null)
  const [gastoForm, setGastoForm] = useState({ desc: '', monto: '', fecha: new Date().toISOString().split('T')[0] })

  const hoy = new Date().toISOString().split('T')[0]
  const formatARS = (n: number) => `$${Number(n||0).toLocaleString('es-AR')}`
  const formatFecha = (d: string) => { if (!d) return ''; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}` }
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    supabase.from('negocios').select('*').eq('slug', slug).single()
      .then(({ data }) => { setNegocio(data); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (!negocio) return
    supabase.from('clientes').select('*').eq('negocio_id', negocio.id).then(({ data }) => setClientes(data || []))
    supabase.from('turnos').select('*').eq('negocio_id', negocio.id).then(({ data }) => setTurnos(data || []))
    supabase.from('gastos').select('*').eq('negocio_id', negocio.id).then(({ data }) => setGastos(data || []))
  }, [negocio])

  if (loading) return <div style={{minHeight:'100vh',background:'#050508',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}><p>Cargando...</p></div>
  if (!negocio) return <div style={{minHeight:'100vh',background:'#050508',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}><p>No encontrado</p></div>

  const color = negocio.rubro === 'peluqueria' ? '#A78BFA' : negocio.rubro === 'veterinaria' ? '#34D399' : '#FF6B35'
  const icon = negocio.rubro === 'peluqueria' ? '✂️' : negocio.rubro === 'veterinaria' ? '🐾' : '🏋️'
  const activos = clientes.filter(c => c.estado === 'activo').length
  const ingresoMes = clientes.filter(c => c.estado !== 'vencido').reduce((s,c) => s + Number(c.cuota||0), 0)
  const mesActual = new Date().toISOString().slice(0,7)
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesActual)).reduce((s,g) => s + Number(g.monto||0), 0)
  const turnosHoy = turnos.filter(t => t.fecha === hoy)

  const agregarCliente = async () => {
    if (!modalData.nombre || !modalData.plan || !modalData.cuota) return showToast('Completá todos los campos')
    await supabase.from('clientes').insert([{negocio_id: negocio.id, nombre: modalData.nombre, telefono: modalData.telefono||'', plan: modalData.plan, cuota: Number(modalData.cuota), vence: modalData.vence||hoy, estado: 'activo'}])
    supabase.from('clientes').select('*').eq('negocio_id', negocio.id).then(({data}) => setClientes(data||[]))
    setModal(null); setModalData({}); showToast('Cliente agregado ✓')
  }

  const agregarTurno = async () => {
    if (!modalData.clienteNombre || !modalData.servicio || !modalData.fecha || !modalData.hora) return showToast('Completá todos los campos')
    await supabase.from('turnos').insert([{negocio_id: negocio.id, cliente_nombre: modalData.clienteNombre, telefono: modalData.telefono||'', servicio: modalData.servicio, fecha: modalData.fecha, hora: modalData.hora, duracion: Number(modalData.duracion||60), estado: 'confirmado', notas: modalData.notas||''}])
    supabase.from('turnos').select('*').eq('negocio_id', negocio.id).then(({data}) => setTurnos(data||[]))
    if (modalData.telefono) {
      const msg = `Hola ${modalData.clienteNombre} 👋 Tu turno en *${negocio.nombre}* es el ${formatFecha(modalData.fecha)} a las ${modalData.hora}hs. ¡Te esperamos!`
      window.open(`https://wa.me/54${modalData.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
    }
    setModal(null); setModalData({}); showToast('Turno creado ✓')
  }

  const agregarGasto = async () => {
    if (!gastoForm.desc || !gastoForm.monto) return showToast('Completá el gasto')
    await supabase.from('gastos').insert([{negocio_id: negocio.id, descripcion: gastoForm.desc, monto: Number(gastoForm.monto), fecha: gastoForm.fecha}])
    supabase.from('gastos').select('*').eq('negocio_id', negocio.id).then(({data}) => setGastos(data||[]))
    setGastoForm({desc:'',monto:'',fecha:hoy}); showToast('Gasto registrado ✓')
  }

  const inp = {background:'#ffffff08',border:'1px solid #ffffff15',color:'#fff',borderRadius:'10px',padding:'.7rem 1rem',fontSize:'.88rem',outline:'none',fontFamily:'sans-serif',width:'100%'} as any

  return (
    <div style={{minHeight:'100vh',background:'#0A0A0F',fontFamily:'sans-serif',color:'#fff'}}>
      <div style={{background:'#13131A',borderBottom:`1px solid ${color}20`,padding:'0 1.25rem',display:'flex',alignItems:'center',gap:'1rem',minHeight:'56px',flexWrap:'wrap' as any}}>
        <span style={{fontSize:'1.3rem'}}>{icon}</span>
        <span style={{color,fontWeight:700}}>{negocio.nombre}</span>
        <nav style={{display:'flex',gap:'.25rem',flex:1,overflowX:'auto' as any}}>
          {[['dashboard','📊 Dashboard'],['agenda','📅 Agenda'],['clientes','👥 Clientes'],['gastos','💸 Caja'],].map(([v,l]) => (
            <button key={v} onClick={() => setVista(v)} style={{background:vista===v?color+'20':'none',color:vista===v?color:'#666',border:'none',cursor:'pointer',padding:'.5rem .9rem',borderRadius:'8px',fontSize:'.82rem',fontFamily:'sans-serif'}}>{l}</button>
          ))}
        </nav>
      </div>

      <div style={{maxWidth:'960px',margin:'0 auto',padding:'1.5rem 1rem'}}>

        {vista === 'dashboard' && (
          <div>
            <h2 style={{fontFamily:'serif',fontSize:'1.6rem',marginBottom:'1.25rem'}}>Resumen — {formatFecha(hoy)}</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.25rem'}}>
              {[[activos,'✅','Activos','#34D399'],[turnosHoy.length,'📅','Turnos hoy',color],[formatARS(ingresoMes),'💰','Ingreso mes','#60A5FA'],[formatARS(ingresoMes-gastosMes),'📊','Neto mes',ingresoMes-gastosMes>=0?'#34D399':'#F87171']].map(([v,i,l,c]:any,idx) => (
                <div key={idx} style={{background:'#ffffff06',border:'1px solid #ffffff0C',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}>
                  <div style={{fontSize:'1.5rem',marginBottom:'.35rem'}}>{i}</div>
                  <div style={{fontSize:'1.4rem',fontWeight:700,color:c,fontFamily:'serif'}}>{v}</div>
                  <div style={{fontSize:'.72rem',color:'#555',marginTop:'.2rem'}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#ffffff06',border:'1px solid #ffffff0C',borderRadius:'16px',padding:'1.4rem',marginBottom:'1.25rem'}}>
              <div style={{fontSize:'.8rem',color:'#555',marginBottom:'1rem',textTransform:'uppercase' as any,letterSpacing:'.08em'}}>📅 Turnos de hoy</div>
              {turnosHoy.length === 0 && <p style={{color:'#444',textAlign:'center' as any,padding:'1rem'}}>Sin turnos para hoy</p>}
              {turnosHoy.map(t => (
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.6rem 0',borderBottom:'1px solid #ffffff07'}}>
                  <div><span style={{color,fontWeight:700,marginRight:'.75rem'}}>{t.hora}</span>{t.cliente_nombre} · {t.servicio}</div>
                  <span style={{fontSize:'.78rem',color:'#34D399'}}>{t.estado}</span>
                </div>
              ))}
              <button onClick={() => {setModal('turno');setModalData({fecha:hoy})}} style={{marginTop:'1rem',background:color,color:'#000',border:'none',borderRadius:'8px',padding:'.6rem 1.2rem',cursor:'pointer',fontWeight:700,fontFamily:'sans-serif'}}>+ Nuevo turno hoy</button>
            </div>
            {clientes.filter(c=>c.estado!=='activo').length > 0 && (
              <div style={{background:'#ffffff06',border:`1px solid #FBBF2425`,borderRadius:'16px',padding:'1.4rem'}}>
                <div style={{fontSize:'.8rem',color:'#FBBF24',marginBottom:'1rem',textTransform:'uppercase' as any,letterSpacing:'.08em'}}>⚡ Alertas de cobro</div>
                {clientes.filter(c=>c.estado!=='activo').map(c => (
                  <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.55rem 0',borderBottom:'1px solid #ffffff07'}}>
                    <span>{c.nombre} · {c.plan}</span>
                    <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <span style={{color,fontWeight:700}}>{formatARS(c.cuota)}</span>
                      {c.telefono && <button onClick={() => window.open(`https://wa.me/54${c.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${c.nombre}, tu cuota en *${negocio.nombre}* está pendiente. ¿Cuándo podés pasar? 😊`)}`, '_blank')} style={{background:'#25D36615',border:'1px solid #25D36630',color:'#25D366',borderRadius:'8px',padding:'.3rem .6rem',cursor:'pointer',fontSize:'.72rem'}}>📲 WA</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vista === 'agenda' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
              <h2 style={{fontFamily:'serif',fontSize:'1.6rem'}}>📅 Agenda — {formatFecha(hoy)}</h2>
              <button onClick={() => {setModal('turno');setModalData({fecha:hoy})}} style={{background:color,color:'#000',border:'none',borderRadius:'10px',padding:'.6rem 1.2rem',cursor:'pointer',fontWeight:700}}>+ Nuevo turno</button>
            </div>
            <div style={{background:'#ffffff06',border:'1px solid #ffffff0C',borderRadius:'16px',padding:'0',overflow:'hidden'}}>
              {turnos.filter(t=>t.fecha===hoy).length === 0 && <p style={{padding:'2rem',textAlign:'center' as any,color:'#444'}}>Sin turnos para hoy</p>}
              {turnos.filter(t=>t.fecha===hoy).sort((a,b)=>a.hora.localeCompare(b.hora)).map(t => (
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem',borderBottom:'1px solid #ffffff07'}}>
                  <div>
                    <span style={{color,fontWeight:700,marginRight:'.75rem'}}>{t.hora}</span>
                    <span style={{fontWeight:500}}>{t.cliente_nombre}</span>
                    <span style={{color:'#666',marginLeft:'.5rem',fontSize:'.85rem'}}>· {t.servicio} ({t.duracion}min)</span>
                  </div>
                  <div style={{display:'flex',gap:'.5rem'}}>
                    {t.telefono && <button onClick={() => { const [h,m]=t.hora.split(':').map(Number); const tot=h*60+m+30; const hr=`${String(Math.floor(tot/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`; window.open(`https://wa.me/54${t.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${t.cliente_nombre}, tu turno de ${t.servicio} tiene una demora de 30 min. Nuevo horario: ${hr}hs. Disculpá! 🙏`)}`, '_blank')}} style={{background:'#FBBF2415',border:'1px solid #FBBF2430',color:'#FBBF24',borderRadius:'8px',padding:'.3rem .6rem',cursor:'pointer',fontSize:'.75rem'}}>⏱ Demora</button>}
                    {t.telefono && <button onClick={() => window.open(`https://wa.me/54${t.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${t.cliente_nombre} 🌟 Te recordamos tu turno de ${t.servicio} hoy a las ${t.hora}hs en *${negocio.nombre}*. ¡Te esperamos!`)}`, '_blank')} style={{background:'#25D36615',border:'1px solid #25D36630',color:'#25D366',borderRadius:'8px',padding:'.3rem .6rem',cursor:'pointer',fontSize:'.75rem'}}>📲 Recordar</button>}
                    <button onClick={async () => { await supabase.from('turnos').update({estado:'completado'}).eq('id',t.id); supabase.from('turnos').select('*').eq('negocio_id',negocio.id).then(({data})=>setTurnos(data||[])); showToast('Completado ✓') }} style={{background:'#34D39915',border:'1px solid #34D39930',color:'#34D399',borderRadius:'8px',padding:'.3rem .6rem',cursor:'pointer',fontSize:'.75rem'}}>✓ Listo</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'clientes' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
              <h2 style={{fontFamily:'serif',fontSize:'1.6rem'}}>{icon} Clientes</h2>
              <button onClick={() => {setModal('cliente');setModalData({})}} style={{background:color,color:'#000',border:'none',borderRadius:'10px',padding:'.6rem 1.2rem',cursor:'pointer',fontWeight:700}}>+ Agregar</button>
            </div>
            <div style={{background:'#ffffff06',border:'1px solid #ffffff0C',borderRadius:'16px',padding:'0',overflow:'hidden'}}>
              {clientes.map(c => (
                <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto auto auto auto',gap:'.5rem',alignItems:'center',padding:'.85rem 1rem',borderBottom:'1px solid #ffffff07'}}>
                  <div><div style={{fontSize:'.88rem',fontWeight:500}}>{c.nombre}</div>{c.telefono&&<div style={{fontSize:'.72rem',color:'#444'}}>📱 {c.telefono}</div>}</div>
                  <div style={{fontSize:'.82rem',color:'#888'}}>{c.plan}</div>
                  <div style={{color,fontWeight:700,fontSize:'.88rem'}}>{formatARS(c.cuota)}</div>
                  <div style={{fontSize:'.78rem',color:'#666'}}>{formatFecha(c.vence)}</div>
                  <span style={{background:c.estado==='activo'?'#34D39920':c.estado==='vence_pronto'?'#FBBF2420':'#F8717120',color:c.estado==='activo'?'#34D399':c.estado==='vence_pronto'?'#FBBF24':'#F87171',padding:'.2rem .6rem',borderRadius:'999px',fontSize:'.72rem',fontWeight:600}}>{c.estado==='activo'?'Activo':c.estado==='vence_pronto'?'Vence pronto':'Vencido'}</span>
                  <div style={{display:'flex',gap:'.35rem'}}>
                    {c.estado!=='activo'&&<button onClick={async()=>{await supabase.from('clientes').update({estado:'activo'}).eq('id',c.id);supabase.from('clientes').select('*').eq('negocio_id',negocio.id).then(({data})=>setClientes(data||[]));showToast('Pagado ✓')}} style={{background:'#34D39915',color:'#34D399',border:'1px solid #34D39930',borderRadius:'8px',padding:'.3rem .55rem',cursor:'pointer',fontSize:'.72rem'}}>✓ Pagó</button>}
                    {c.telefono&&<button onClick={()=>window.open(`https://wa.me/54${c.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${c.nombre}, te contactamos desde *${negocio.nombre}*. Tu cuota está pendiente. ¿Cuándo podés pasar? 😊`)}`, '_blank')} style={{background:'#25D36615',color:'#25D366',border:'1px solid #25D36630',borderRadius:'8px',padding:'.3rem .55rem',cursor:'pointer',fontSize:'.72rem'}}>📲</button>}
                    <button onClick={async()=>{await supabase.from('clientes').delete().eq('id',c.id);setClientes(clientes.filter(x=>x.id!==c.id));showToast('Eliminado')}} style={{background:'#F8717115',color:'#F87171',border:'none',borderRadius:'8px',padding:'.3rem .5rem',cursor:'pointer',fontSize:'.72rem'}}>✕</button>
                  </div>
                </div>
              ))}
              {clientes.length===0&&<p style={{padding:'2rem',textAlign:'center' as any,color:'#444'}}>Sin clientes todavía</p>}
            </div>
          </div>
        )}

        {vista === 'gastos' && (
          <div>
            <h2 style={{fontFamily:'serif',fontSize:'1.6rem',marginBottom:'1.25rem'}}>💸 Caja</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem',marginBottom:'1.25rem'}}>
              {[[formatARS(ingresoMes),'Ingresos','#34D399'],[formatARS(gastosMes),'Gastos','#F87171'],[formatARS(ingresoMes-gastosMes),'Neto',ingresoMes-gastosMes>=0?'#34D399':'#F87171']].map(([v,l,c]:any,i)=>(
                <div key={i} style={{background:'#ffffff06',border:'1px solid #ffffff0C',borderRadius:'16px',padding:'1.25rem',textAlign:'center' as any}}>
                  <div style={{color:c,fontSize:'1.3rem',fontWeight:700,fontFamily:'serif'}}>{v}</div>
                  <div style={{color:'#555',fontSize:'.75rem',marginTop:'.25rem'}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#ffffff06',border:'1px solid #ffffff0C',borderRadius:'16px',padding:'1.4rem',marginBottom:'1.25rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 140px 120px auto',gap:'.75rem',alignItems:'end'}}>
                <input style={inp} placeholder="Descripción" value={gastoForm.desc} onChange={e=>setGastoForm({...gastoForm,desc:e.target.value})} />
                <input style={inp} type="number" placeholder="Monto $" value={gastoForm.monto} onChange={e=>setGastoForm({...gastoForm,monto:e.target.value})} />
                <input style={inp} type="date" value={gastoForm.fecha} onChange={e=>setGastoForm({...gastoForm,fecha:e.target.value})} />
                <button onClick={agregarGasto} style={{background:color,color:'#000',border:'none',borderRadius:'10px',padding:'.7rem 1.2rem',cursor:'pointer',fontWeight:700,whiteSpace:'nowrap' as any}}>+ Agregar</button>
              </div>
            </div>
            <div style={{background:'#ffffff06',border:'1px solid #ffffff0C',borderRadius:'16px',padding:'0',overflow:'hidden'}}>
              {gastos.length===0&&<p style={{padding:'2rem',textAlign:'center' as any,color:'#444'}}>Sin gastos</p>}
              {gastos.map(g=>(
                <div key={g.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.8rem 1rem',borderBottom:'1px solid #ffffff07'}}>
                  <div><div style={{fontSize:'.88rem'}}>{g.descripcion}</div><div style={{fontSize:'.72rem',color:'#444'}}>{formatFecha(g.fecha)}</div></div>
                  <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                    <span style={{color:'#F87171',fontWeight:700}}>- {formatARS(g.monto)}</span>
                    <button onClick={async()=>{await supabase.from('gastos').delete().eq('id',g.id);setGastos(gastos.filter(x=>x.id!==g.id));showToast('Eliminado')}} style={{background:'#F8717115',color:'#F87171',border:'none',borderRadius:'8px',padding:'.25rem .5rem',cursor:'pointer',fontSize:'.72rem'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {modal === 'turno' && (
        <div style={{position:'fixed',inset:0,background:'#000000AA',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{background:'#13131A',border:'1px solid #ffffff12',borderRadius:'22px',padding:'1.75rem',width:'100%',maxWidth:'480px'}}>
            <h3 style={{fontFamily:'serif',fontSize:'1.3rem',marginBottom:'1.25rem'}}>📅 Nuevo Turno</h3>
            <div style={{display:'flex',flexDirection:'column' as any,gap:'.75rem'}}>
              <input style={inp} placeholder="Nombre del cliente" value={modalData.clienteNombre||''} onChange={e=>setModalData({...modalData,clienteNombre:e.target.value})} />
              <input style={inp} placeholder="Teléfono (WhatsApp)" value={modalData.telefono||''} onChange={e=>setModalData({...modalData,telefono:e.target.value})} />
              <input style={inp} placeholder="Servicio" value={modalData.servicio||''} onChange={e=>setModalData({...modalData,servicio:e.target.value})} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem'}}>
                <input style={inp} type="date" value={modalData.fecha||hoy} onChange={e=>setModalData({...modalData,fecha:e.target.value})} />
                <select style={inp} value={modalData.hora||''} onChange={e=>setModalData({...modalData,hora:e.target.value})}>
                  <option value="">Hora</option>
                  {['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'].map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <input style={inp} placeholder="Notas (opcional)" value={modalData.notas||''} onChange={e=>setModalData({...modalData,notas:e.target.value})} />
            </div>
            <div style={{display:'flex',gap:'.75rem',marginTop:'1.25rem',justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(null)} style={{background:'transparent',border:'1px solid #ffffff18',color:'#888',borderRadius:'10px',padding:'.6rem 1.1rem',cursor:'pointer'}}>Cancelar</button>
              <button onClick={agregarTurno} style={{background:color,color:'#000',border:'none',borderRadius:'10px',padding:'.6rem 1.5rem',cursor:'pointer',fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cliente' && (
        <div style={{position:'fixed',inset:0,background:'#000000AA',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'1rem'}} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{background:'#13131A',border:'1px solid #ffffff12',borderRadius:'22px',padding:'1.75rem',width:'100%',maxWidth:'480px'}}>
            <h3 style={{fontFamily:'serif',fontSize:'1.3rem',marginBottom:'1.25rem'}}>+ Nuevo Cliente</h3>
            <div style={{display:'flex',flexDirection:'column' as any,gap:'.75rem'}}>
              <input style={inp} placeholder="Nombre" value={modalData.nombre||''} onChange={e=>setModalData({...modalData,nombre:e.target.value})} />
              <input style={inp} placeholder="Teléfono (WhatsApp)" value={modalData.telefono||''} onChange={e=>setModalData({...modalData,telefono:e.target.value})} />
              <input style={inp} placeholder="Plan (ej: Musculación, Corte, etc.)" value={modalData.plan||''} onChange={e=>setModalData({...modalData,plan:e.target.value})} />
              <input style={inp} type="number" placeholder="Cuota mensual ($)" value={modalData.cuota||''} onChange={e=>setModalData({...modalData,cuota:e.target.value})} />
              <input style={inp} type="date" value={modalData.vence||''} onChange={e=>setModalData({...modalData,vence:e.target.value})} />
            </div>
            <div style={{display:'flex',gap:'.75rem',marginTop:'1.25rem',justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(null)} style={{background:'transparent',border:'1px solid #ffffff18',color:'#888',borderRadius:'10px',padding:'.6rem 1.1rem',cursor:'pointer'}}>Cancelar</button>
              <button onClick={agregarCliente} style={{background:color,color:'#000',border:'none',borderRadius:'10px',padding:'.6rem 1.5rem',cursor:'pointer',fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{position:'fixed',bottom:'1.5rem',right:'1.5rem',background:'#13131A',border:'1px solid #ffffff15',borderRadius:'12px',padding:'.7rem 1.2rem',fontSize:'.85rem',zIndex:200}}>{toast}</div>}
    </div>
  )
}