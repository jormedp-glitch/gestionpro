// lib/domain/mensajes.ts
//
// Mensajes WhatsApp centralizados (spec R3): un módulo por evento, redacción
// canónica definida en A6.
//
// - Los 5 eventos de reparaciones conservan VERBATIM el template
//   `lib/types-reparaciones.ts` (MENSAJES_WHATSAPP).
// - turno_confirmado / demora / recordatorio_turno conservan VERBATIM los
//   textos inline del monolito `app/[slug]/page.tsx`.
// - cobro: gana la variante de la vista clientes del monolito (A6). La
//   variante del dashboard ("tu cuota en *X* está pendiente") queda como
//   delta visible documentado para verify.
// - mensajeAprobado es NUEVO (el evento no existía): sigue el estilo de los
//   existentes (saludo con nombre, equipo, monto en *negrita*, cierre cordial).
//
// Los textos visibles NO se traducen ni se reescriben: se preservan tal cual
// para no alterar la comunicación con el cliente final.

/** Ingreso de equipo: saludo, N° de orden y link de seguimiento. */
export function mensajeIngreso(
  nombre: string,
  equipo: string,
  orden: string,
  link: string,
): string {
  return `Hola ${nombre}, recibimos tu ${equipo}. N° de orden: *${orden}*. Podés seguir el estado en: ${link} ¡Gracias por confiar en nosotros!`;
}

/** Presupuesto enviado: diagnóstico y monto en *negrita*. */
export function mensajePresupuesto(
  nombre: string,
  equipo: string,
  monto: number,
): string {
  return `Hola ${nombre}, ya tenemos el diagnóstico de tu ${equipo}. El presupuesto es de *$${monto.toLocaleString("es-AR")}*. ¿Lo aprobamos y arrancamos con la reparación?`;
}

/** NUEVO: presupuesto aprobado por el cliente; se arranca la reparación. */
export function mensajeAprobado(
  nombre: string,
  equipo: string,
  monto: number,
): string {
  return `Hola ${nombre}, confirmamos la aprobación del presupuesto de tu ${equipo}: *$${monto.toLocaleString("es-AR")}*. Ya arrancamos con la reparación. ¡Te avisamos cuando esté listo!`;
}

/** Equipo listo para retirar: total a abonar en *negrita*. */
export function mensajeListo(
  nombre: string,
  equipo: string,
  precio: number,
): string {
  return `Hola ${nombre}, ¡tu ${equipo} ya está listo! Podés pasar a retirarlo cuando quieras. El total a abonar es *$${precio.toLocaleString("es-AR")}*. ¡Hasta pronto!`;
}

/** Sin reparación: aviso de retiro sin costo (estado terminal, D-05). */
export function mensajeSinReparacion(nombre: string, equipo: string): string {
  return `Hola ${nombre}, lamentablemente no pudimos resolver el problema de tu ${equipo}. Podés pasar a retirarlo sin costo. Disculpá los inconvenientes.`;
}

/** Recordatorio de retiro: equipo listo hace N días. */
export function mensajeRecordatorioRetiro(
  nombre: string,
  equipo: string,
  dias: number,
): string {
  return `Hola ${nombre}, te recordamos que tu ${equipo} está listo hace *${dias} días*. Cuando puedas pasá a buscarlo. ¡Gracias!`;
}

/** Confirmación de turno (fecha ya formateada dd/mm/aaaa). */
export function mensajeTurnoConfirmado(
  negocio: string,
  cliente: string,
  fecha: string,
  hora: string,
): string {
  return `Hola ${cliente} 👋 Tu turno en *${negocio}* es el ${fecha} a las ${hora}hs. ¡Te esperamos!`;
}

/** Demora de turno. Redacción vigente del monolito: +30 min fijo. */
export function mensajeDemora(
  cliente: string,
  servicio: string,
  horaReal: string,
): string {
  return `Hola ${cliente}, tu turno de ${servicio} tiene una demora de 30 min. Nuevo horario: ${horaReal}hs. Disculpá! 🙏`;
}

/** Recordatorio de turno (mismo día). */
export function mensajeRecordatorioTurno(
  cliente: string,
  servicio: string,
  hora: string,
  negocio: string,
): string {
  return `Hola ${cliente} 🌟 Te recordamos tu turno de ${servicio} hoy a las ${hora}hs en *${negocio}*. ¡Te esperamos!`;
}

/** Cobro de cuota pendiente. Variante canónica: vista clientes (A6). */
export function mensajeCobro(negocio: string, cliente: string): string {
  return `Hola ${cliente}, te contactamos desde *${negocio}*. Tu cuota está pendiente. ¿Cuándo podés pasar? 😊`;
}
