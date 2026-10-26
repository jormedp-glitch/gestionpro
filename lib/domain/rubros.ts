// lib/domain/rubros.ts
//
// Reglas de negocio por rubro (issue #179). En servicio técnico el turno suele
// ser un compromiso interno del taller ("mañana retiro 2 máquinas"), no un
// aviso al cliente: el recordatorio por WhatsApp arranca apagado. En el resto
// de los rubros el aviso al cliente es la norma y arranca encendido. Ante un
// rubro desconocido o legacy se cae al default permisivo (true), mismo
// criterio que accentPorRubro en lib/ui/theme.
//
// Predicado de carga gym (SDD rubro-profesor): `profesor` reutiliza íntegramente
// el core de datos del gimnasio (alumnos/rutinas/progreso/ejercicios); el resto
// de los rubros no (design D3).

/**
 * Default del checkbox "Avisar al cliente por WhatsApp" al crear un turno:
 * false solo para servicio_tecnico; true para el resto (incluido cualquier
 * rubro desconocido).
 */
export function avisoTurnoPorDefecto(rubro: string): boolean {
  return rubro !== "servicio_tecnico";
}

/**
 * True solo para los rubros del core de gym (design D3): `gimnasio` y
 * `profesor` comparten la carga alumnos/rutinas/progreso/ejercicios en
 * app/[slug]/page.tsx. Consumido como único lugar donde vive la unión
 * de rubros gym-core.
 */
export function esRubroGymCore(rubro: string): boolean {
  return rubro === "gimnasio" || rubro === "profesor";
}
