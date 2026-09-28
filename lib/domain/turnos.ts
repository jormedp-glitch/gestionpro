// lib/domain/turnos.ts
//
// Prefill del alta de turno desde una reparación (issue #180): en el taller el
// turno natural es el retiro/entrega del equipo, y la reparación ya tiene
// cliente, teléfono y equipo. Helper puro para testear la regla sin UI.

/**
 * Arma los valores iniciales del alta de turno desde el equipo: cliente y
 * teléfono salen del join; el servicio describe el retiro/entrega (sin
 * espacios dobles cuando falta marca/modelo) y las notas referencian el
 * número de orden para poder cruzar el turno con la reparación.
 */
export function valoresTurnoDesdeEquipo(equipo: {
  numero_orden: string;
  categoria: string;
  marca: string | null;
  modelo: string | null;
  clientes: { nombre: string; telefono: string } | null;
}): {
  clienteNombre: string;
  telefono: string;
  servicio: string;
  notas: string;
} {
  const detalle = [equipo.marca ?? "", equipo.modelo ?? ""]
    .filter(Boolean)
    .join(" ");
  const servicio = ["Retiro/Entrega", equipo.categoria, detalle]
    .filter(Boolean)
    .join(" ");
  return {
    clienteNombre: equipo.clientes?.nombre ?? "",
    telefono: equipo.clientes?.telefono ?? "",
    servicio,
    notas: `Reparación ${equipo.numero_orden}`,
  };
}
