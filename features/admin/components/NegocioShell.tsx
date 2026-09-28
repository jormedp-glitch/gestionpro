// features/admin/components/NegocioShell.tsx
//
// Shell del negocio (client component, spec R5/A4): switcher de vista SIN
// cambio de ruta (misma navegación que el monolito original) con el
// encabezado compartido NegocioHeader (issue #183: las rutas fuera del
// shell lo reusan). Recibe los datos ya leídos en el Server Component
// (R8) y compone las secciones de cada feature; las escrituras pasan por
// Server Actions (R9). Los modales y el toast viven acá para replicar el
// comportamiento del page original.

"use client";

import { useState } from "react";
import {
  NegocioHeader,
  iconoRubro,
  type Vista,
} from "@/features/admin/components/NegocioHeader";
import { DashboardResumen } from "@/features/admin/components/DashboardResumen";
import { TurnosAgenda } from "@/features/turnos/components/TurnosAgenda";
import { NuevoTurnoModal } from "@/features/turnos/components/NuevoTurnoModal";
import { ClientesLista } from "@/features/clientes/components/ClientesLista";
import { NuevoClienteModal } from "@/features/clientes/components/NuevoClienteModal";
import { CobrosNegocio } from "@/features/cobros/components/CobrosNegocio";
import { GastosCaja } from "@/features/gastos/components/GastosCaja";
import { AlumnosGym } from "@/features/gym/components/AlumnosGym";
import { RutinasGym } from "@/features/gym/components/RutinasGym";
import { BibliotecaEjercicios } from "@/features/gym/components/BibliotecaEjercicios";
import { toast, Toaster } from "@/lib/ui/toast";
import type { Negocio } from "@/lib/auth/dal";
import type { Cliente } from "@/features/clientes/data/clientes";
import type { Cobro } from "@/features/cobros/data/cobros";
import type { Turno } from "@/features/turnos/data/turnos";
import type { Gasto } from "@/features/gastos/data/gastos";
import type {
  GymAlumno,
  GymEjercicio,
  GymProgresoResumen,
  GymRutina,
} from "@/features/gym/data/gym";

export function NegocioShell({
  slug,
  negocio,
  clientes,
  cobros,
  turnos,
  gastos,
  activos,
  ingresoMes,
  gastosMes,
  turnosHoy,
  turnosSemana,
  hoy,
  esOwner,
  alumnos,
  progreso,
  rutinas,
  ejercicios,
  vistaInicial,
}: {
  slug: string;
  negocio: Negocio;
  clientes: Cliente[];
  cobros: Cobro[];
  turnos: Turno[];
  gastos: Gasto[];
  activos: number;
  ingresoMes: number;
  gastosMes: number;
  turnosHoy: Turno[];
  /** Turnos de los próximos 7 días (issue #187), ya filtrados y ordenados. */
  turnosSemana: Turno[];
  hoy: string;
  esOwner: boolean;
  alumnos?: GymAlumno[];
  progreso?: GymProgresoResumen[];
  rutinas?: GymRutina[];
  ejercicios?: GymEjercicio[];
  /** Vista con la que abre el shell (`?vista=`); por defecto dashboard. */
  vistaInicial?: Vista;
}) {
  const [vista, setVista] = useState<Vista>(vistaInicial ?? "dashboard");
  const [modal, setModal] = useState<null | "turno" | "cliente">(null);
  const [modalData, setModalData] = useState<{ fecha?: string }>({});

  const icon = iconoRubro(negocio.rubro);

  const showToast = (msg: string) => {
    toast(msg, { duration: 3000 });
  };

  const abrirTurno = (fecha?: string) => {
    setModalData(fecha ? { fecha } : {});
    setModal("turno");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NegocioHeader
        slug={slug}
        negocio={negocio}
        esOwner={esOwner}
        activa={vista}
        onVista={setVista}
      />

      <div className="mx-auto max-w-[960px] px-4 py-6">
        {vista === "dashboard" && (
          <DashboardResumen
            clientes={clientes}
            turnosHoy={turnosHoy}
            turnosSemana={turnosSemana}
            activos={activos}
            ingresoMes={ingresoMes}
            gastosMes={gastosMes}
            hoy={hoy}
            negocioNombre={negocio.nombre}
            onNuevoTurno={() => abrirTurno(hoy)}
          />
        )}

        {vista === "agenda" && (
          <TurnosAgenda
            slug={slug}
            rubro={negocio.rubro}
            negocioNombre={negocio.nombre}
            turnos={turnos}
            hoy={hoy}
            // Issue #189: el alta usa la fecha del día seleccionado.
            onNuevoTurno={abrirTurno}
            showToast={showToast}
          />
        )}

        {vista === "clientes" && (
          <ClientesLista
            slug={slug}
            clientes={clientes}
            negocioNombre={negocio.nombre}
            icon={icon}
            cobros={cobros}
            hoy={hoy}
            onNuevoCliente={() => {
              setModalData({});
              setModal("cliente");
            }}
            showToast={showToast}
          />
        )}

        {vista === "alumnos" && (
          <AlumnosGym
            slug={slug}
            alumnos={alumnos ?? []}
            progreso={progreso ?? []}
            showToast={showToast}
          />
        )}

        {vista === "rutinas" && (
          <>
            <RutinasGym
              slug={slug}
              rutinas={rutinas ?? []}
              showToast={showToast}
            />
            <div className="mt-8">
              <BibliotecaEjercicios
                slug={slug}
                ejercicios={ejercicios ?? []}
                showToast={showToast}
              />
            </div>
          </>
        )}

        {vista === "cobros" && (
          <CobrosNegocio cobros={cobros} clientes={clientes} hoy={hoy} />
        )}

        {vista === "gastos" && (
          <GastosCaja
            slug={slug}
            gastos={gastos}
            ingresoMes={ingresoMes}
            gastosMes={gastosMes}
            hoy={hoy}
            showToast={showToast}
          />
        )}
      </div>

      {modal === "turno" && (
        <NuevoTurnoModal
          slug={slug}
          rubro={negocio.rubro}
          fechaInicial={modalData.fecha || hoy}
          // Aviso no bloqueante de superposición (#190) con los turnos ya
          // cargados del negocio.
          turnosExistentes={turnos}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}

      {modal === "cliente" && (
        <NuevoClienteModal
          slug={slug}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}

      <Toaster />
    </div>
  );
}
