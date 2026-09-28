// lib/domain/ingresos.ts
//
// Ingresos del negocio (issue #177): los KPIs de plata (Caja y Dashboard) se
// calculan sobre la tabla `cobros` — plata realmente cobrada — y no sobre las
// cuotas proyectadas de los clientes, que dejaban afuera los pagos de
// reparaciones y cualquier otro cobro suelto. Dominio puro y determinista:
// sin DB ni Date.now(); el mes lo inyecta el caller y las fechas son
// YYYY-MM-DD / mes YYYY-MM (mismo criterio que lib/domain/cuotas.ts).

/**
 * Total cobrado del mes (YYYY-MM): filtra los cobros cuya `fecha` (YYYY-MM-DD)
 * cae en `mes` y suma los montos. `monto` null/undefined cuenta 0 y un string
 * numérico se convierte con Number (shape crudo que puede llegar de la DB).
 */
export function totalCobradoDelMes(
  cobros: ReadonlyArray<{
    fecha: string;
    monto: number | string | null | undefined;
  }>,
  mes: string,
): number {
  return cobros
    .filter((c) => c.fecha.startsWith(mes))
    .reduce((total, c) => total + Number(c.monto || 0), 0);
}
