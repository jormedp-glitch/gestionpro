// app/[slug]/page.tsx
//
// Shell server del negocio (spec R5/R8, A4): resuelve el negocio + membresía
// con el DAL (fase 1), lee los datos con el cliente server y delega el
// render interactivo (tabs, modales, escrituras) al client component
// NegocioShell. Sin monolitos >500 líneas en app/. Issue #183: `?vista=`
// elige la sección inicial (links del header desde rutas fuera del shell).

import { getSessionUser, isOwner } from "@/lib/auth/dal";
import { requireNegocio } from "@/lib/server/negocio";
import { getClientesDeNegocio } from "@/features/clientes/data/clientes";
import { getCobrosDeNegocio } from "@/features/cobros/data/cobros";
import { getTurnosDeNegocio } from "@/features/turnos/data/turnos";
import { getGastosDeNegocio } from "@/features/gastos/data/gastos";
import {
  getAlumnosDeNegocio,
  getEjerciciosDeNegocio,
  getProgresoDeNegocio,
  getRutinasDeNegocio,
} from "@/features/gym/data/gym";
import { totalCobradoDelMes } from "@/lib/domain/ingresos";
import { proximosTurnos } from "@/lib/domain/agenda";
import { NegocioShell } from "@/features/admin/components/NegocioShell";
import type { Vista } from "@/features/admin/components/NegocioHeader";

// Vistas válidas para `?vista=` (issue #183): el shell solo inicializa en
// estas secciones; cualquier otro valor cae en dashboard. El `satisfies`
// avisa en compile-time si el shell suma una vista nueva.
const VISTAS_VALIDAS = [
  "dashboard",
  "agenda",
  "clientes",
  "alumnos",
  "rutinas",
  "cobros",
  "gastos",
] as const satisfies readonly Vista[];

function esVistaValida(valor: string): valor is Vista {
  return (VISTAS_VALIDAS as readonly string[]).includes(valor);
}

export default async function NegocioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const { vista } = await searchParams;
  const negocio = await requireNegocio(slug);

  // Issue #183: `?vista=` permite que los links del header (que viven en
  // rutas fuera del shell) abran el shell en la sección pedida.
  const vistaInicial: Vista =
    typeof vista === "string" && esVistaValida(vista) ? vista : "dashboard";

  // R6: el link "Usuarios" se muestra SOLO al owner. No se lee la lista de
  // miembros acá (D3): editores no reciben ese dato (va por /usuarios).
  const user = await getSessionUser();
  const esOwner = user ? await isOwner(user.id, negocio.id) : false;

  // R1: los datos de gimnasio solo se cargan para el rubro gimnasio; el flag
  // se resuelve antes del Promise.all para no serializar el segundo fetch.
  const esGimnasio = negocio.rubro === "gimnasio";

  const [
    clientes,
    turnos,
    gastos,
    cobros,
    alumnos,
    progreso,
    rutinas,
    ejercicios,
  ] = await Promise.all([
    getClientesDeNegocio(negocio.id),
    getTurnosDeNegocio(negocio.id),
    getGastosDeNegocio(negocio.id),
    // R10/R12: el historial de cobros es un dato central de todos los rubros.
    getCobrosDeNegocio(negocio.id),
    esGimnasio ? getAlumnosDeNegocio(negocio.id) : Promise.resolve([]),
    esGimnasio ? getProgresoDeNegocio(negocio.id) : Promise.resolve([]),
    esGimnasio ? getRutinasDeNegocio(negocio.id) : Promise.resolve([]),
    esGimnasio ? getEjerciciosDeNegocio(negocio.id) : Promise.resolve([]),
  ]);

  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = hoy.slice(0, 7);
  const activos = clientes.filter((c) => c.estado === "activo").length;
  // Ingresos reales del mes (issue #177): se suman los cobros registrados
  // (reparaciones, cuotas, etc.), no las cuotas proyectadas de los clientes.
  const ingresoMes = totalCobradoDelMes(cobros, mesActual);
  const gastosMes = gastos
    .filter((g) => g.fecha?.startsWith(mesActual))
    .reduce((s, g) => s + Number(g.monto || 0), 0);
  const turnosHoy = turnos.filter((t) => t.fecha === hoy);
  // Issue #187: ventana de planificación semanal del dashboard (hoy + 6).
  const turnosSemana = proximosTurnos(turnos, hoy, 7);

  return (
    <NegocioShell
      slug={slug}
      negocio={negocio}
      clientes={clientes}
      turnos={turnos}
      gastos={gastos}
      cobros={cobros}
      activos={activos}
      ingresoMes={ingresoMes}
      gastosMes={gastosMes}
      turnosHoy={turnosHoy}
      turnosSemana={turnosSemana}
      hoy={hoy}
      esOwner={esOwner}
      alumnos={alumnos}
      progreso={progreso}
      rutinas={rutinas}
      ejercicios={ejercicios}
      vistaInicial={vistaInicial}
    />
  );
}
