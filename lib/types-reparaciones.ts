// lib/types-reparaciones.ts

export type EstadoReparacion =
  | 'recibido'
  | 'en_diagnostico'
  | 'presupuesto_enviado'
  | 'esperando_aprobacion'
  | 'aprobado'
  | 'en_reparacion'
  | 'listo_para_retirar'
  | 'entregado'
  | 'sin_reparacion'

export const ESTADOS_REPARACION: {
  valor: EstadoReparacion
  etiqueta: string
  color: string
}[] = [
  { valor: 'recibido',               etiqueta: 'Recibido',               color: 'bg-gray-100 text-gray-700' },
  { valor: 'en_diagnostico',         etiqueta: 'En diagnóstico',         color: 'bg-blue-100 text-blue-700' },
  { valor: 'presupuesto_enviado',    etiqueta: 'Presupuesto enviado',    color: 'bg-yellow-100 text-yellow-700' },
  { valor: 'esperando_aprobacion',   etiqueta: 'Esperando aprobación',   color: 'bg-orange-100 text-orange-700' },
  { valor: 'aprobado',               etiqueta: 'Aprobado',               color: 'bg-cyan-100 text-cyan-700' },
  { valor: 'en_reparacion',          etiqueta: 'En reparación',          color: 'bg-purple-100 text-purple-700' },
  { valor: 'listo_para_retirar',     etiqueta: 'Listo para retirar',     color: 'bg-green-100 text-green-700' },
  { valor: 'entregado',              etiqueta: 'Entregado',              color: 'bg-green-200 text-green-800' },
  { valor: 'sin_reparacion',         etiqueta: 'Sin reparación',         color: 'bg-red-100 text-red-700' },
]

export const CATEGORIAS_EQUIPO = [
  'PC / Desktop',
  'Notebook',
  'Celular',
  'Tablet',
  'TV',
  'Impresora',
  'Parlante / Audio',
  'Consola',
  'Otro',
]

export interface Equipo {
  id: string
  negocio_id: string
  cliente_id: string | null
  numero_orden: string
  categoria: string
  marca: string | null
  modelo: string | null
  numero_serie: string | null
  problema_reportado: string
  accesorios: string | null
  fecha_ingreso: string
  fecha_estimada_entrega: string | null
  estado: EstadoReparacion
  tecnico_asignado: string | null
  presupuesto: number | null
  presupuesto_aceptado: boolean | null
  precio_final: number | null
  fecha_entrega: string | null
  observaciones_internas: string | null
  created_at: string
  // join con clientes
  clientes?: {
    nombre: string
    telefono: string
  }
}

export interface HistorialReparacion {
  id: string
  equipo_id: string
  negocio_id: string
  estado_anterior: string | null
  estado_nuevo: string
  comentario: string | null
  fecha: string
  usuario: string | null
}

export interface RepuestoReparacion {
  id: string
  equipo_id: string
  negocio_id: string
  descripcion: string
  costo: number
  precio_cobrado: number
  cantidad: number
}

// Mensajes WhatsApp por evento
export const MENSAJES_WHATSAPP = {
  ingreso: (nombre: string, equipo: string, orden: string, link: string) =>
    `Hola ${nombre}, recibimos tu ${equipo}. N° de orden: *${orden}*. Podés seguir el estado en: ${link} ¡Gracias por confiar en nosotros!`,

  presupuesto: (nombre: string, equipo: string, monto: number) =>
    `Hola ${nombre}, ya tenemos el diagnóstico de tu ${equipo}. El presupuesto es de *$${monto.toLocaleString('es-AR')}*. ¿Lo aprobamos y arrancamos con la reparación?`,

  listo: (nombre: string, equipo: string, precio: number) =>
    `Hola ${nombre}, ¡tu ${equipo} ya está listo! Podés pasar a retirarlo cuando quieras. El total a abonar es *$${precio.toLocaleString('es-AR')}*. ¡Hasta pronto!`,

  sin_reparacion: (nombre: string, equipo: string) =>
    `Hola ${nombre}, lamentablemente no pudimos resolver el problema de tu ${equipo}. Podés pasar a retirarlo sin costo. Disculpá los inconvenientes.`,

  recordatorio_retiro: (nombre: string, equipo: string, dias: number) =>
    `Hola ${nombre}, te recordamos que tu ${equipo} está listo hace *${dias} días*. Cuando puedas pasá a buscarlo. ¡Gracias!`,
}   