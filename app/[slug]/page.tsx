// app/[slug]/page.tsx
//
// Shell server del negocio (spec R5/R8, A4): resuelve el negocio + membresía
// con el DAL (fase 1), lee los datos con el cliente server y delega el
// render interactivo (tabs, modales, escrituras) al client component
// NegocioShell. Sin monolitos >500 líneas en app/.

import { getSessionUser, isOwner } from "@/lib/auth/dal";
import { requireNegocio } from "@/lib/server/negocio";
import { getClientesDeNegocio } from "@/features/clientes/data/clientes";
import { getTurnosDeNegocio } from "@/features/turnos/data/turnos";
import { getGastosDeNegocio } from "@/features/gastos/data/gastos";
import { NegocioShell } from "@/features/admin/components/NegocioShell";

export default async function NegocioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await requireNegocio(slug);

  // R6: el link "Usuarios" se muestra SOLO al owner. No se lee la lista de
  // miembros acá (D3): editores no reciben ese dato (va por /usuarios).
  const user = await getSessionUser();
  const esOwner = user ? await isOwner(user.id, negocio.id) : false;

  const [clientes, turnos, gastos] = await Promise.all([
    getClientesDeNegocio(negocio.id),
    getTurnosDeNegocio(negocio.id),
    getGastosDeNegocio(negocio.id),
  ]);

  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = hoy.slice(0, 7);
  const activos = clientes.filter((c) => c.estado === "activo").length;
  const ingresoMes = clientes
    .filter((c) => c.estado !== "vencido")
    .reduce((s, c) => s + Number(c.cuota || 0), 0);
  const gastosMes = gastos
    .filter((g) => g.fecha?.startsWith(mesActual))
    .reduce((s, g) => s + Number(g.monto || 0), 0);
  const turnosHoy = turnos.filter((t) => t.fecha === hoy);

  return (
    <NegocioShell
      slug={slug}
      negocio={negocio}
      clientes={clientes}
      turnos={turnos}
      gastos={gastos}
      activos={activos}
      ingresoMes={ingresoMes}
      gastosMes={gastosMes}
      turnosHoy={turnosHoy}
      hoy={hoy}
      esOwner={esOwner}
    />
  );
}
