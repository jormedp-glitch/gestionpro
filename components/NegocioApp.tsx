'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'

// â”€â”€â”€ CONFIG RUBROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RUBROS: any = {
  gimnasio: {
    label: "Gimnasio", icon: "ðŸ‹ï¸", color: "#FF6B35", dark: "#110800", mid: "#1E0F00",
    entidad: "Socio", entidades: "Socios",
    planes: ["MusculaciÃ³n", "Cardio", "Funcional", "Completo", "CrossFit"],
    servicios: ["MusculaciÃ³n libre", "Clase de cardio", "Funcional grupal", "CrossFit", "Spinning", "Yoga"],
    duraciones: [45, 60, 90],
  },
  peluqueria: {
    label: "PeluquerÃ­a / SalÃ³n", icon: "âœ‚ï¸", color: "#A78BFA", dark: "#080012", mid: "#130020",
    entidad: "Cliente", entidades: "Clientes",
    planes: ["Corte", "Color", "Alisado", "Tratamiento", "Combo VIP"],
    servicios: ["Corte dama", "Corte caballero", "ColoraciÃ³n", "Mechas", "Alisado", "Tratamiento capilar", "Manicura"],
    duraciones: [30, 45, 60, 90, 120],
  },
  veterinaria: {
    label: "Veterinaria", icon: "ðŸ¾", color: "#34D399", dark: "#001208", mid: "#001F10",
    entidad: "Paciente", entidades: "Pacientes",
    planes: ["Control bÃ¡sico", "Vacunas", "Plan Premium", "CirugÃ­a", "GuarderÃ­a"],
    servicios: ["Consulta general", "VacunaciÃ³n", "CirugÃ­a", "PeluquerÃ­a canina", "EcografÃ­a", "AnÃ¡lisis", "Urgencia"],
    duraciones: [20, 30, 45, 60],
  },
}

const HORAS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const DIAS_SEMANA = ["Dom","Lun","Mar","MiÃ©","Jue","Vie","SÃ¡b"]

const hoy = () => new Date().toISOString().split("T")[0]
const formatFecha = (d: string) => { if (!d) return ""; const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}` }
const formatARS = (n: number) => `$${Number(n||0).toLocaleString("es-AR")}`
const mesActual = () => new Date().toISOString().slice(0, 7)

const getDiasDelMes = (year: number, month: number) => ({
  first: new Date(year, month, 1).getDay(),
  total: new Date(year, month + 1, 0).getDate()
})

const msgWA = {
  confirmacion: (neg: string, cli: string, serv: string, fecha: string, hora: string) =>
    `Hola ${cli} ðŸ‘‹ Te confirmamos tu turno en *${neg}*:\n\nðŸ“… *${formatFecha(fecha)}* a las *${hora}hs*\nðŸ’‡ Servicio: ${serv}\n\nSi necesitÃ¡s cancelar avisanos con anticipaciÃ³n. Â¡Te esperamos! âœ¨`,
  demora: (neg: string, cli: string, serv: string, min: number, horaReal: string) =>
    `Hola ${cli} ðŸ‘‹ Te avisamos desde *${neg}* que tu turno de *${serv}* tiene una demora de *${min} minutos*.\n\nâ° Nuevo horario estimado: *${horaReal}hs*\n\nDisculpÃ¡ las molestias, podÃ©s venir mÃ¡s tarde. Â¡Gracias! ðŸ™`,
  recordatorio: (neg: string, cli: string, serv: string, fecha: string, hora: string) =>
    `Hola ${cli} ðŸŒŸ Te recordamos tu turno en *${neg}* para maÃ±ana:\n\nðŸ“… *${formatFecha(fecha)}* a las *${hora}hs*\nðŸ’‡ Servicio: ${serv}\n\nÂ¿ConfirmÃ¡s? RespondÃ© *SÃ* o avisanos si necesitÃ¡s reprogramar. ðŸ˜Š`,
  cobro: (neg: string, cli: string, cuota: string) =>
    `Hola ${cli} ðŸ‘‹ Te contactamos desde *${neg}*. Tu cuota de ${cuota} estÃ¡ prÃ³xima a vencer. Â¿CuÃ¡ndo podÃ©s pasar a renovar? ðŸ˜Š`,
}

const abrirWA = (tel: string, msg: string) => {
  const num = tel.replace(/\D/g, "")
  const full = num.startsWith("54") ? num : `54${num}`
  window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, "_blank")
}

// â”€â”€â”€ COMPONENTE PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function NegocioApp({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState("dashboard")
  const [clientes, setClientes] = useState<any[]>([])
  const [turnos, setTurnos] = useState<any[]>([])
  const [gastos, setGastos] = useState<any[]>([])
  const [modal, setModal] = useState<string | null>(null)
  const [modalData, setModalData] = useState<any>({})
  const [toast, setToast] = useState<any>(null)
  const [aiMsg, setAiMsg] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [calFecha, setCalFecha] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() } })
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy())
  const [gastoForm, setGastoForm] = useState({ desc: "", monto: "", fecha: hoy() })
  const [demoraModal, setDemoraModal] = useState<any>(null)
  const [demoraMin, setDemoraMin] = useState(30)

  // â”€â”€ Cargar negocio â”€â”€
  useEffect(() => {
    supabase.from('negocios').select('*').eq('slug', slug).single()
      .then(({ data }) => { setNegocio(data); setLoading(false) })
  }, [slug])

  // â”€â”€ Cargar datos cuando negocio cargue â”€â”€
  useEffect(() => {
    if (!negocio) return
    cargarClientes()
    cargarTurnos()
    cargarGastos()
  }, [negocio])

  const cargarClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').eq('negocio_id', negocio.id).order('created_at', { ascending: false })
    setClientes(data || [])
  }
  const cargarTurnos = async () => {
    const { data } = await supabase.from('turnos').select('*').eq('negocio_id', negocio.id).order('fecha').order('hora')
    setTurnos(data || [])
  }
  const cargarGastos = async () => {
    const { data } = await supabase.from('gastos').select('*').eq('negocio_id', negocio.id).order('fecha', { ascending: false })
    setGastos(data || [])
  }

  const showToast = (msg: string, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500) }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '1rem' }}>âš¡</div><p>Cargando...</p></div>
    </div>
  )
  if (!negocio) return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>Negocio no encontrado</p>
    </div>
  )

  const R = RUBROS[negocio.rubro] || RUBROS.gimnasio

  // â”€â”€ STATS â”€â”€
  const activos = clientes.filter(c => c.estado === 'activo').length
  const vencenProx = clientes.filter(c => c.estado === 'vence_pronto').length
  const vencidos = clientes.filter(c => c.estado === 'vencido').length
  const ingresoMes = clientes.filter(c => c.estado !== 'vencido').reduce((s, c) => s + Number(c.cuota || 0), 0)
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesActual())).reduce((s, g) => s + Number(g.monto || 0), 0)
  const flujoNeto = ingresoMes - gastosMes
  const turnosHoy = turnos.filter(t => t.fecha === hoy())
  const turnosDia = turnos.filter(t => t.fecha === diaSeleccionado).sort((a, b) => a.hora.localeCompare(b.hora))

  const estadoTurnoColor: any = { confirmado: "#34D399", en_espera: "#60A5FA", demorado: "#FBBF24", cancelado: "#F87171", completado: "#6B7280" }
  const estadoTurnoLabel: any = { confirmado: "Confirmado", en_espera: "En espera", demorado: "Demorado âš ï¸", cancelado: "Cancelado", completado: "Completado âœ“" }
  const estadoClienteColor: any = { activo: "#34D399", vence_pronto: "#FBBF24", vencido: "#F87171" }
  const estadoClienteLabel: any = { activo: "Activo", vence_pronto: "Vence pronto", vencido: "Vencido" }

  // â”€â”€ ACCIONES CLIENTES â”€â”€
  const agregarCliente = async () => {
    const d = modalData
    if (!d.nombre || !d.plan || !d.cuota) return showToast("CompletÃ¡ todos los campos", "err")
    await supabase.from('clientes').insert([{ negocio_id: negocio.id, nombre: d.nombre, telefono: d.telefono || '', plan: d.plan, cuota: Number(d.cuota), vence: d.vence || hoy(), estado: 'activo' }])
    cargarClientes(); setModal(null); setModalData({}); showToast(`${R.entidad} agregado âœ“`)
  }

  const marcarPagado = async (id: string) => {
    await supabase.from('clientes').update({ estado: 'activo' }).eq('id', id)
    cargarClientes(); showToast("Marcado como pagado âœ“")
  }

  const eliminarCliente = async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id)
    cargarClientes(); showToast("Eliminado")
  }

  // â”€â”€ ACCIONES TURNOS â”€â”€
  const agregarTurno = async () => {
    const d = modalData
    if (!d.clienteNombre || !d.servicio || !d.fecha || !d.hora) return showToast("CompletÃ¡ todos los campos", "err")
    await supabase.from('turnos').insert([{ negocio_id: negocio.id, cliente_nombre: d.clienteNombre, telefono: d.telefono || '', servicio: d.servicio, fecha: d.fecha, hora: d.hora, duracion: Number(d.duracion || 60), estado: 'confirmado', notas: d.notas || '' }])
    cargarTurnos()
    if (d.telefono) { abrirWA(d.telefono, msgWA.confirmacion(negocio.nombre, d.clienteNombre, d.servicio, d.fecha, d.hora)); showToast("Turno creado y WhatsApp abierto âœ“") }
    else showToast("Turno creado âœ“")
    setModal(null); setModalData({})
  }

  const cambiarEstadoTurno = async (id: string, estado: string) => {
    await supabase.from('turnos').update({ estado }).eq('id', id)
    cargarTurnos(); showToast("Estado actualizado âœ“")
  }

  const eliminarTurno = async (id: string, turno: any) => {
    if (turno.telefono) abrirWA(turno.telefono, `Hola ${turno.cliente_nombre}, cancelamos tu turno del ${formatFecha(turno.fecha)} a las ${turno.hora}hs en *${negocio.nombre}*. DisculpÃ¡ los inconvenientes ðŸ™`)
    await supabase.from('turnos').delete().eq('id', id)
    cargarTurnos(); showToast("Turno eliminado")
  }

  const enviarDemora = async () => {
    if (!demoraModal) return
    const [h, m] = demoraModal.hora.split(":").map(Number)
    const total = h * 60 + m + demoraMin
    const horaReal = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
    abrirWA(demoraModal.telefono, msgWA.demora(negocio.nombre, demoraModal.cliente_nombre, demoraModal.servicio, demoraMin, horaReal))
    await supabase.from('turnos').update({ estado: 'demorado', notas: `Demora ${demoraMin} min` }).eq('id', demoraModal.id)
    cargarTurnos(); setDemoraModal(null); showToast(`Demora enviada a ${demoraModal.cliente_nombre} âœ“`)
  }

  // â”€â”€ ACCIONES GASTOS â”€â”€
  const agregarGasto = async () => {
    if (!gastoForm.desc || !gastoForm.monto) return showToast("CompletÃ¡ el gasto", "err")
    await supabase.from('gastos').insert([{ negocio_id: negocio.id, descripcion: gastoForm.desc, monto: Number(gastoForm.monto), fecha: gastoForm.fecha }])
    cargarGastos(); setGastoForm({ desc: "", monto: "", fecha: hoy() }); showToast("Gasto registrado âœ“")
  }

  const eliminarGasto = async (id: string) => {
    await supabase.from('gastos').delete().eq('id', id)
    cargarGastos(); showToast("Eliminado")
  }

  // â”€â”€ IA ANÃLISIS â”€â”€
  const pedirIA = async () => {
    setAiLoading(true); setAiMsg(""); setVista("ia")
    const prompt = `Sos el asistente de gestiÃ³n de "${negocio.nombre}" (${R.label}) en TucumÃ¡n, Argentina.

DATOS DEL MES:
- ${R.entidades} activos: ${activos} | Vencen pronto: ${vencenProx} | Morosos: ${vencidos}
- Ingreso estimado: ${formatARS(ingresoMes)} | Gastos: ${formatARS(gastosMes)} | Neto: ${formatARS(flujoNeto)}
- Turnos hoy: ${turnosHoy.length}
- Morosos: ${clientes.filter(c => c.estado === 'vencido').map(c => `${c.nombre} (${formatARS(c.cuota)})`).join(", ") || "Ninguno"}

GenerÃ¡ un anÃ¡lisis ejecutivo con:
1. ðŸ¥ Estado general (1-2 oraciones)
2. âš¡ Top 3 alertas urgentes
3. ðŸ’¡ 3 acciones concretas para esta semana
4. ðŸ’° CuÃ¡nto recuperÃ¡s cobrando morosos
5. ðŸ“ˆ Meta realista para el prÃ³ximo mes

RespondÃ© en espaÃ±ol, directo y Ãºtil. UsÃ¡ emojis. MÃ¡ximo 250 palabras.`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      })
      const data = await res.json()
      setAiMsg(data.content?.[0]?.text || "No se pudo generar el anÃ¡lisis.")
    } catch { setAiMsg("Error al conectar con la IA.") }
    setAiLoading(false)
  }

  // â”€â”€ CALENDARIO â”€â”€
  const { y: calY, m: calM } = calFecha
  const { first, total } = getDiasDelMes(calY, calM)

  const navVistas = [
    { id: "dashboard", label: "Dashboard", icon: "ðŸ“Š" },
    { id: "agenda", label: "Agenda", icon: "ðŸ“…" },
    { id: "clientes", label: R.entidades, icon: "ðŸ‘¥" },
    { id: "gastos", label: "Caja", icon: "ðŸ’¸" },
    { id: "ia", label: "IA", icon: "ðŸ¤–" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: R.dark, fontFamily: "'Outfit', sans-serif", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
        .nb{background:none;border:none;cursor:pointer;color:#555;font-family:'Outfit',sans-serif;font-size:.82rem;padding:.55rem .9rem;border-radius:10px;transition:all .2s;white-space:nowrap}
        .nb.act{background:${R.color}18;color:${R.color};font-weight:600}
        .nb:hover:not(.act){background:#ffffff08;color:#999}
        .card{background:#ffffff06;border:1px solid #ffffff0C;border-radius:18px;padding:1.4rem}
        .btn{border:none;cursor:pointer;border-radius:10px;font-family:'Outfit',sans-serif;font-weight:500;transition:all .2s;font-size:.85rem;padding:.55rem 1.1rem}
        .btn-p{background:${R.color};color:#000}
        .btn-p:hover{opacity:.85}
        .btn-g{background:transparent;border:1px solid #ffffff18;color:#888}
        .btn-g:hover{background:#ffffff0A;color:#ccc}
        .btn-wa{background:#25D36615;border:1px solid #25D36630;color:#25D366}
        .btn-wa:hover{background:#25D36625}
        .inp{background:#ffffff06;border:1px solid #ffffff12;color:#fff;border-radius:10px;padding:.7rem 1rem;font-size:.88rem;outline:none;font-family:'Outfit',sans-serif;width:100%;transition:border .2s}
        .inp:focus{border-color:${R.color}50}
        .inp option{background:#1a1a2e}
        .row{padding:.85rem 1rem;border-bottom:1px solid #ffffff07;transition:background .15s}
        .row:hover{background:#ffffff04}
        .badge{display:inline-flex;align-items:center;padding:.2rem .6rem;border-radius:999px;font-size:.72rem;font-weight:600}
        .modal-bg{position:fixed;inset:0;background:#000000AA;display:flex;align-items:center;justify-content:center;z-index:100;padding:1rem;backdrop-filter:blur(4px)}
        .modal{background:#13131A;border:1px solid #ffffff12;border-radius:22px;padding:1.75rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto}
        .toast{position:fixed;bottom:1.5rem;right:1.5rem;background:#13131A;border:1px solid #ffffff15;border-radius:12px;padding:.7rem 1.2rem;font-size:.85rem;z-index:200;animation:sup .3s ease}
        @keyframes sup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .cal-day{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:.82rem;cursor:pointer;transition:all .2s;border:none;background:transparent;color:#666;font-family:'Outfit',sans-serif}
        .cal-day:hover{background:#ffffff10;color:#fff}
        .cal-day.hoy{background:${R.color}30;color:${R.color};font-weight:700}
        .cal-day.sel{background:${R.color};color:#000;font-weight:700}
        .cal-day.tiene{box-shadow:0 0 0 2px ${R.color}60}
        .pulse{animation:pls 1.5s infinite}
        @keyframes pls{0%,100%{opacity:1}50%{opacity:.3}}
        .ia-text{white-space:pre-wrap;line-height:1.85;color:#ddd;font-size:.9rem}
        .turno-card{background:#ffffff06;border:1px solid #ffffff0C;border-radius:14px;padding:1rem;margin-bottom:.75rem}
        .turno-card.demorado{border-color:#FBBF2430;background:#FBBF2408}
        @media(max-width:600px){.stats-g{grid-template-columns:1fr 1fr!important}.agenda-g{grid-template-columns:1fr!important}}
      `}</style>

      {/* HEADER */}
      <div style={{ background: R.mid, borderBottom: `1px solid ${R.color}15`, padding: "0 1.25rem", display: "flex", alignItems: "center", gap: "1rem", minHeight: "56px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexShrink: 0 }}>
          <span style={{ fontSize: "1.4rem" }}>{R.icon}</span>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: ".95rem", fontWeight: 700, color: R.color }}>{negocio.nombre}</div>
            <div style={{ fontSize: ".65rem", color: "#444" }}>GestiÃ³nPro Â· {R.label}</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: ".15rem", flex: 1, overflowX: "auto" }}>
          {navVistas.map(v => (
            <button key={v.id} className={`nb ${vista === v.id ? "act" : ""}`} onClick={() => setVista(v.id)}>
              {v.icon} {v.label}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ maxWidth: "980px", margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* â•â•â•â• DASHBOARD â•â•â•â• */}
        {vista === "dashboard" && (
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.7rem", marginBottom: "1.25rem" }}>
              Resumen â€” {formatFecha(hoy())}
            </h2>
            <div className="stats-g" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
              {[
                { icon: "âœ…", val: activos, label: R.entidades + " activos", c: "#34D399" },
                { icon: "âš ï¸", val: vencenProx, label: "Vencen pronto", c: "#FBBF24" },
                { icon: "ðŸ“…", val: turnosHoy.length, label: "Turnos hoy", c: R.color },
                { icon: "ðŸ’°", val: formatARS(ingresoMes), label: "Ingreso mes", c: "#60A5FA" },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: ".35rem" }}>{s.icon}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.c, fontFamily: "'Cormorant Garamond',serif" }}>{s.val}</div>
                  <div style={{ fontSize: ".72rem", color: "#555", marginTop: ".2rem" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Flujo */}
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: ".8rem", color: "#555", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: ".08em" }}>ðŸ’µ Flujo de caja del mes</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".75rem" }}>
                {[["Ingresos", ingresoMes, "#34D399"], ["Gastos", gastosMes, "#F87171"], ["Neto", flujoNeto, flujoNeto >= 0 ? "#34D399" : "#F87171"]].map(([l, v, c]: any) => (
                  <div key={l} style={{ background: c + "10", borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                    <div style={{ color: c, fontSize: "1.2rem", fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>{formatARS(v)}</div>
                    <div style={{ color: "#555", fontSize: ".75rem", marginTop: ".2rem" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Turnos hoy */}
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: ".8rem", color: "#555", textTransform: "uppercase", letterSpacing: ".08em" }}>ðŸ“… Agenda de hoy</span>
                <button className="btn btn-p" style={{ fontSize: ".78rem", padding: ".4rem .8rem" }} onClick={() => setVista("agenda")}>Ver completa â†’</button>
              </div>
              {turnosHoy.length === 0 && <p style={{ color: "#444", fontSize: ".85rem", textAlign: "center", padding: "1rem" }}>Sin turnos para hoy</p>}
              {turnosHoy.slice(0, 4).map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".6rem 0", borderBottom: "1px solid #ffffff07" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <span style={{ color: R.color, fontWeight: 700, fontSize: ".9rem", minWidth: "45px" }}>{t.hora}</span>
                    <div>
                      <div style={{ fontSize: ".88rem" }}>{t.cliente_nombre}</div>
                      <div style={{ fontSize: ".75rem", color: "#555" }}>{t.servicio}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <span className="badge" style={{ background: estadoTurnoColor[t.estado] + "20", color: estadoTurnoColor[t.estado] }}>{estadoTurnoLabel[t.estado]}</span>
                    {t.telefono && <button className="btn btn-wa" style={{ padding: ".3rem .6rem", fontSize: ".72rem" }} onClick={() => { setDemoraModal(t); setDemoraMin(30) }}>â± Demora</button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Alertas cobro */}
            {(vencenProx > 0 || vencidos > 0) && (
              <div className="card" style={{ borderColor: "#FBBF2425", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: ".8rem", color: "#FBBF24", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "1rem" }}>âš¡ Alertas de cobro</div>
                {clientes.filter(c => c.estado !== 'activo').map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".55rem 0", borderBottom: "1px solid #ffffff07" }}>
                    <div>
                      <span style={{ fontSize: ".88rem" }}>{c.nombre}</span>
                      <span style={{ marginLeft: ".5rem", color: "#444", fontSize: ".78rem" }}>Â· {c.plan}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                      <span style={{ color: estadoClienteColor[c.estado], fontSize: ".78rem" }}>{estadoClienteLabel[c.estado]}</span>
                      <span style={{ color: R.color, fontWeight: 700, fontSize: ".88rem" }}>{formatARS(c.cuota)}</span>
                      {c.telefono && <button className="btn btn-wa" style={{ padding: ".3rem .6rem", fontSize: ".72rem" }} onClick={() => abrirWA(c.telefono, msgWA.cobro(negocio.nombre, c.nombre, formatARS(c.cuota)))}>ðŸ“² WA</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-p" onClick={pedirIA} style={{ width: "100%", padding: ".9rem", fontSize: "1rem" }}>
              ðŸ¤– AnÃ¡lisis completo con IA
            </button>
          </div>
        )}

        {/* â•â•â•â• AGENDA â•â•â•â• */}
        {vista === "agenda" && (
          <div className="agenda-g" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem" }}>
            <div>
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <button className="btn btn-g" style={{ padding: ".3rem .7rem" }} onClick={() => setCalFecha(p => { const m = p.m === 0 ? 11 : p.m - 1; return { y: m === 11 ? p.y - 1 : p.y, m } })}>â€¹</button>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1rem", fontWeight: 700 }}>{MESES[calM]} {calY}</span>
                  <button className="btn btn-g" style={{ padding: ".3rem .7rem" }} onClick={() => setCalFecha(p => { const m = p.m === 11 ? 0 : p.m + 1; return { y: m === 0 ? p.y + 1 : p.y, m } })}>â€º</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: ".2rem", marginBottom: ".5rem" }}>
                  {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign: "center", fontSize: ".65rem", color: "#444", padding: ".25rem 0" }}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: ".2rem" }}>
                  {Array.from({ length: first }).map((_, i) => <div key={"e" + i} />)}
                  {Array.from({ length: total }).map((_, i) => {
                    const dia = i + 1
                    const dStr = `${calY}-${String(calM + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
                    const tieneTurnos = turnos.some(t => t.fecha === dStr)
                    const esHoy = dStr === hoy()
                    const esSel = dStr === diaSeleccionado
                    return <button key={dia} className={`cal-day ${esHoy && !esSel ? "hoy" : ""} ${esSel ? "sel" : ""} ${tieneTurnos && !esSel ? "tiene" : ""}`} onClick={() => setDiaSeleccionado(dStr)}>{dia}</button>
                  })}
                </div>
              </div>
              <div className="card">
                <div style={{ fontSize: ".75rem", color: "#555", marginBottom: ".75rem" }}>ðŸ“Š {formatFecha(diaSeleccionado)}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: R.color, fontFamily: "'Cormorant Garamond',serif" }}>{turnosDia.length}</div>
                <div style={{ fontSize: ".8rem", color: "#666", marginBottom: ".75rem" }}>turnos agendados</div>
                <button className="btn btn-p" style={{ width: "100%", padding: ".6rem" }} onClick={() => { setModal("turno"); setModalData({ fecha: diaSeleccionado }) }}>+ Nuevo turno</button>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem" }}>Turnos Â· {formatFecha(diaSeleccionado)}</h3>
              </div>
              {HORAS.map(h => {
                const turno = turnosDia.find(t => t.hora === h || t.hora?.startsWith(h))
                return (
                  <div key={h} style={{ display: "flex", gap: ".75rem", marginBottom: ".5rem", alignItems: "flex-start" }}>
                    <div style={{ width: "48px", color: turno ? R.color : "#333", fontSize: ".8rem", fontWeight: turno ? 700 : 400, paddingTop: "1rem", flexShrink: 0, textAlign: "right" }}>{h}</div>
                    <div style={{ flex: 1 }}>
                      {turno ? (
                        <div className={`turno-card ${turno.estado}`}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600, fontSize: ".92rem" }}>{turno.cliente_nombre}</span>
                                <span className="badge" style={{ background: estadoTurnoColor[turno.estado] + "20", color: estadoTurnoColor[turno.estado] }}>{estadoTurnoLabel[turno.estado]}</span>
                              </div>
                              <div style={{ fontSize: ".8rem", color: "#777", marginTop: ".2rem" }}>{turno.servicio} Â· {turno.duracion}min</div>
                              {turno.notas && <div style={{ fontSize: ".75rem", color: "#FBBF24", marginTop: ".25rem" }}>ðŸ“ {turno.notas}</div>}
                            </div>
                            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {turno.telefono && <>
                                <button className="btn btn-wa" style={{ padding: ".3rem .6rem", fontSize: ".72rem" }} onClick={() => abrirWA(turno.telefono, msgWA.recordatorio(negocio.nombre, turno.cliente_nombre, turno.servicio, turno.fecha, turno.hora))}>ðŸ“² Recordar</button>
                                <button className="btn" style={{ background: "#FBBF2415", color: "#FBBF24", border: "1px solid #FBBF2430", padding: ".3rem .6rem", fontSize: ".72rem" }} onClick={() => { setDemoraModal(turno); setDemoraMin(30) }}>â± Demora</button>
                              </>}
                              {turno.estado !== "completado" && <button className="btn" style={{ background: "#34D39915", color: "#34D399", border: "1px solid #34D39930", padding: ".3rem .6rem", fontSize: ".72rem" }} onClick={() => cambiarEstadoTurno(turno.id, "completado")}>âœ“ Listo</button>}
                              <button className="btn" style={{ background: "#F8717115", color: "#F87171", border: "none", padding: ".3rem .5rem", fontSize: ".72rem" }} onClick={() => eliminarTurno(turno.id, turno)}>âœ•</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: "36px", borderLeft: "1px solid #ffffff08", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: ".75rem" }} onClick={() => { setModal("turno"); setModalData({ fecha: diaSeleccionado, hora: h }) }}>
                          <span style={{ fontSize: ".75rem", color: "#333" }}>+ agregar</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* â•â•â•â• CLIENTES â•â•â•â• */}
        {vista === "clientes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.7rem" }}>{R.icon} {R.entidades}</h2>
              <button className="btn btn-p" onClick={() => { setModal("cliente"); setModalData({}) }}>+ Agregar {R.entidad}</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto auto", gap: ".5rem", padding: ".7rem 1rem", background: "#ffffff05", fontSize: ".7rem", color: "#444", textTransform: "uppercase", letterSpacing: ".08em" }}>
                <span>{R.entidad}</span><span>Plan</span><span>Cuota</span><span>Vence</span><span>Estado</span><span>Acc</span>
              </div>
              {clientes.map(c => (
                <div key={c.id} className="row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto auto", gap: ".5rem", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: ".88rem", fontWeight: 500 }}>{c.nombre}</div>
                    {c.telefono && <div style={{ fontSize: ".72rem", color: "#444" }}>ðŸ“± {c.telefono}</div>}
                  </div>
                  <div style={{ fontSize: ".82rem", color: "#888" }}>{c.plan}</div>
                  <div style={{ fontSize: ".88rem", color: R.color, fontWeight: 700 }}>{formatARS(c.cuota)}</div>
                  <div style={{ fontSize: ".78rem", color: "#666" }}>{formatFecha(c.vence)}</div>
                  <span className="badge" style={{ background: estadoClienteColor[c.estado] + "20", color: estadoClienteColor[c.estado] }}>{estadoClienteLabel[c.estado]}</span>
                  <div style={{ display: "flex", gap: ".35rem" }}>
                    {c.estado !== "activo" && <button className="btn" style={{ background: "#34D39915", color: "#34D399", border: "1px solid #34D39930", padding: ".3rem .55rem", fontSize: ".72rem" }} onClick={() => marcarPagado(c.id)}>âœ“ PagÃ³</button>}
                    {c.telefono && <button className="btn btn-wa" style={{ padding: ".3rem .55rem", fontSize: ".72rem" }} onClick={() => abrirWA(c.telefono, msgWA.cobro(negocio.nombre, c.nombre, formatARS(c.cuota)))}>ðŸ“²</button>}
                    <button className="btn" style={{ background: "#F8717115", color: "#F87171", border: "none", padding: ".3rem .5rem", fontSize: ".72rem" }} onClick={() => eliminarCliente(c.id)}>âœ•</button>
                  </div>
                </div>
              ))}
              {clientes.length === 0 && <div style={{ padding: "2.5rem", textAlign: "center", color: "#333" }}>Sin {R.entidades.toLowerCase()} todavÃ­a</div>}
            </div>
          </div>
        )}

        {/* â•â•â•â• GASTOS â•â•â•â• */}
        {vista === "gastos" && (
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.7rem", marginBottom: "1.25rem" }}>ðŸ’¸ Caja del Negocio</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              {[["ðŸ’š Ingresos", ingresoMes, "#34D399"], ["ðŸ”´ Gastos", gastosMes, "#F87171"], [flujoNeto >= 0 ? "âœ… Neto" : "âš ï¸ Neto", flujoNeto, flujoNeto >= 0 ? "#34D399" : "#F87171"]].map(([l, v, c]: any) => (
                <div key={l} className="card" style={{ textAlign: "center" }}>
                  <div style={{ color: c, fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>{formatARS(v)}</div>
                  <div style={{ color: "#555", fontSize: ".75rem", marginTop: ".25rem" }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px auto", gap: ".75rem", alignItems: "end" }}>
                <input className="inp" placeholder="DescripciÃ³n (alquiler, luz, insumos...)" value={gastoForm.desc} onChange={e => setGastoForm({ ...gastoForm, desc: e.target.value })} />
                <input className="inp" type="number" placeholder="Monto $" value={gastoForm.monto} onChange={e => setGastoForm({ ...gastoForm, monto: e.target.value })} />
                <input className="inp" type="date" value={gastoForm.fecha} onChange={e => setGastoForm({ ...gastoForm, fecha: e.target.value })} />
                <button className="btn btn-p" onClick={agregarGasto} style={{ whiteSpace: "nowrap" }}>+ Agregar</button>
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {gastos.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "#333", fontSize: ".85rem" }}>Sin gastos registrados</div>}
              {gastos.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".8rem 1rem", borderBottom: "1px solid #ffffff07" }}>
                  <div>
                    <div style={{ fontSize: ".88rem" }}>{g.descripcion}</div>
                    <div style={{ fontSize: ".72rem", color: "#444" }}>{formatFecha(g.fecha)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "#F87171", fontWeight: 700 }}>- {formatARS(g.monto)}</span>
                    <button className="btn" style={{ background: "#F8717115", color: "#F87171", border: "none", padding: ".25rem .5rem", fontSize: ".72rem" }} onClick={() => eliminarGasto(g.id)}>âœ•</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* â•â•â•â• IA â•â•â•â• */}
        {vista === "ia" && (
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.7rem", marginBottom: "1.25rem" }}>ðŸ¤– AnÃ¡lisis con IA</h2>
            <div style={{ display: "flex", gap: ".75rem", marginBottom: "1.25rem" }}>
              <button className="btn btn-p" onClick={pedirIA}>ðŸ“Š Generar anÃ¡lisis</button>
              {aiMsg && <button className="btn btn-g" onClick={() => setAiMsg("")}>Limpiar</button>}
            </div>
            <div className="card">
              {aiLoading && <div style={{ textAlign: "center", padding: "3rem" }}><div style={{ fontSize: "2.5rem", marginBottom: "1rem" }} className="pulse">ðŸ¤–</div><p style={{ color: "#555" }}>Analizando tu negocio...</p></div>}
              {!aiLoading && !aiMsg && <div style={{ textAlign: "center", padding: "3rem" }}><div style={{ fontSize: "3rem", marginBottom: "1rem" }}>ðŸ“Š</div><p style={{ color: "#555" }}>HacÃ© click en "Generar anÃ¡lisis" para que la IA analice tu negocio</p></div>}
              {!aiLoading && aiMsg && <div className="ia-text">{aiMsg}</div>}
            </div>
          </div>
        )}
      </div>

      {/* â•â•â•â• MODAL TURNO â•â•â•â• */}
      {modal === "turno" && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", marginBottom: "1.25rem" }}>ðŸ“… Nuevo Turno</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <input className="inp" placeholder="Nombre del cliente" value={modalData.clienteNombre || ""} onChange={e => setModalData({ ...modalData, clienteNombre: e.target.value })} list="cli-list" />
              <datalist id="cli-list">{clientes.map(c => <option key={c.id} value={c.nombre} />)}</datalist>
              <input className="inp" placeholder="TelÃ©fono (para WhatsApp)" value={modalData.telefono || ""} onChange={e => setModalData({ ...modalData, telefono: e.target.value })} />
              <select className="inp" value={modalData.servicio || ""} onChange={e => setModalData({ ...modalData, servicio: e.target.value })}>
                <option value="">Seleccionar servicio</option>
                {R.servicios.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <div>
                  <label style={{ fontSize: ".75rem", color: "#555", display: "block", marginBottom: ".3rem" }}>Fecha</label>
                  <input className="inp" type="date" value={modalData.fecha || hoy()} onChange={e => setModalData({ ...modalData, fecha: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: ".75rem", color: "#555", display: "block", marginBottom: ".3rem" }}>Hora</label>
                  <select className="inp" value={modalData.hora || ""} onChange={e => setModalData({ ...modalData, hora: e.target.value })}>
                    <option value="">Seleccionar hora</option>
                    {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <select className="inp" value={modalData.duracion || "60"} onChange={e => setModalData({ ...modalData, duracion: e.target.value })}>
                {R.duraciones.map((d: number) => <option key={d} value={d}>{d} minutos</option>)}
              </select>
              <input className="inp" placeholder="Notas (opcional)" value={modalData.notas || ""} onChange={e => setModalData({ ...modalData, notas: e.target.value })} />
            </div>
            <div style={{ marginTop: ".5rem", padding: ".75rem", background: "#25D36610", borderRadius: "10px", border: "1px solid #25D36630" }}>
              <div style={{ fontSize: ".75rem", color: "#25D366" }}>ðŸ“² Si ingresÃ¡s el telÃ©fono, se abrirÃ¡ WhatsApp con el mensaje de confirmaciÃ³n automÃ¡ticamente.</div>
            </div>
            <div style={{ display: "flex", gap: ".75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
              <button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={agregarTurno}>Guardar turno</button>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â• MODAL CLIENTE â•â•â•â• */}
      {modal === "cliente" && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", marginBottom: "1.25rem" }}>+ Nuevo {R.entidad}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <input className="inp" placeholder={`Nombre del ${R.entidad.toLowerCase()}`} value={modalData.nombre || ""} onChange={e => setModalData({ ...modalData, nombre: e.target.value })} />
              <input className="inp" placeholder="TelÃ©fono (para WhatsApp)" value={modalData.telefono || ""} onChange={e => setModalData({ ...modalData, telefono: e.target.value })} />
              <select className="inp" value={modalData.plan || ""} onChange={e => setModalData({ ...modalData, plan: e.target.value })}>
                <option value="">Seleccionar plan</option>
                {R.planes.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input className="inp" type="number" placeholder="Monto mensual ($)" value={modalData.cuota || ""} onChange={e => setModalData({ ...modalData, cuota: e.target.value })} />
              <div>
                <label style={{ fontSize: ".75rem", color: "#555", display: "block", marginBottom: ".3rem" }}>Fecha de vencimiento</label>
                <input className="inp" type="date" value={modalData.vence || ""} onChange={e => setModalData({ ...modalData, vence: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: ".75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
              <button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={agregarCliente}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â• MODAL DEMORA â•â•â•â• */}
      {demoraModal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setDemoraModal(null)}>
          <div className="modal" style={{ maxWidth: "400px" }}>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: ".5rem" }}>â±ï¸</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem" }}>Avisar demora</h3>
              <p style={{ color: "#666", fontSize: ".85rem", marginTop: ".25rem" }}>{demoraModal.cliente_nombre} Â· {demoraModal.hora}hs</p>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: ".8rem", color: "#888", display: "block", marginBottom: ".5rem" }}>Â¿CuÃ¡ntos minutos de demora?</label>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {[15, 20, 30, 45, 60].map(m => (
                  <button key={m} className="btn" style={{ background: demoraMin === m ? R.color : "#ffffff10", color: demoraMin === m ? "#000" : "#aaa", border: "none", padding: ".5rem 1rem" }} onClick={() => setDemoraMin(m)}>{m} min</button>
                ))}
              </div>
            </div>
            <div style={{ background: "#25D36610", border: "1px solid #25D36630", borderRadius: "10px", padding: ".85rem", marginBottom: "1.25rem", fontSize: ".8rem", color: "#25D366" }}>
              ðŸ“² Se abrirÃ¡ WhatsApp con el aviso de demora para {demoraModal.cliente_nombre}
            </div>
            <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end" }}>
              <button className="btn btn-g" onClick={() => setDemoraModal(null)}>Cancelar</button>
              <button className="btn btn-wa" style={{ padding: ".6rem 1.25rem" }} onClick={enviarDemora}>ðŸ“² Enviar por WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast" style={{ borderColor: toast.tipo === "err" ? "#F87171" : R.color + "40", color: toast.tipo === "err" ? "#F87171" : "#ccc" }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
/ /   v 2 
 
 / /   d e p l o y   f i x 
 
 
