// lib/domain/rubros.ts
//
// Reglas de negocio por rubro (issue #179). En servicio técnico el turno suele
// ser un compromiso interno del taller ("mañana retiro 2 máquinas"), no un
// aviso al cliente: el recordatorio por WhatsApp arranca apagado. En el resto
// de los rubros el aviso al cliente es la norma y arranca encendido. Ante un
// rubro desconocido o legacy se cae al default permisivo (true), mismo
// criterio que accentPorRubro en lib/ui/theme.

/**
 * Default del checkbox "Avisar al cliente por WhatsApp" al crear un turno:
 * false solo para servicio_tecnico; true para el resto (incluido cualquier
 * rubro desconocido).
 */
export function avisoTurnoPorDefecto(rubro: string): boolean {
  return rubro !== "servicio_tecnico";
}
