// features/admin/components/NegocioShell.tsx
//
// Shell del negocio (client component, spec R5/A4): encabezado con tabs por
// feature y switcher de vista SIN cambio de ruta (misma navegación que el
// monolito original). Recibe los datos ya leídos en el Server Component
// (R8) y compone las secciones de cada feature; las escrituras pasan por
// Server Actions (R9). Los modales y el toast viven acá para replicar el
// comportamiento del page original.

"use client";

import { useState } from "react";
import { logout } from "@/lib/auth/actions";
import { DashboardResumen } from "@/features/admin/components/DashboardResumen";
import { TurnosAgenda } from "@/features/turnos/components/TurnosAgenda";
import { NuevoTurnoModal } from "@/features/turnos/components/NuevoTurnoModal";
import { ClientesLista } from "@/features/clientes/components/ClientesLista";
import { NuevoClienteModal } from "@/features/clientes/components/NuevoClienteModal";
import { GastosCaja } from "@/features/gastos/components/GastosCaja";
import { accentPorRubro } from "@/lib/ui/theme";
import { toast, Toaster } from "@/lib/ui/toast";
import { Button } from "@/lib/ui/button";
import { cn } from "@/lib/ui/utils";
import type { Negocio } from "@/lib/auth/dal";
import type { Cliente } from "@/features/clientes/data/clientes";
import type { Turno } from "@/features/turnos/data/turnos";
import type { Gasto } from "@/features/gastos/data/gastos";

type Vista = "dashboard" | "agenda" | "clientes" | "gastos";

function iconoRubro(rubro: string): string {
  if (rubro === "peluqueria") return "✂️";
  if (rubro === "veterinaria") return "🐾";
  if (rubro === "servicio_tecnico") return "🔧";
  return "🏋️";
}

export function NegocioShell({
  slug,
  negocio,
  clientes,
  turnos,
  gastos,
  activos,
  ingresoMes,
  gastosMes,
  turnosHoy,
  hoy,
}: {
  slug: string;
  negocio: Negocio;
  clientes: Cliente[];
  turnos: Turno[];
  gastos: Gasto[];
  activos: number;
  ingresoMes: number;
  gastosMes: number;
  turnosHoy: Turno[];
  hoy: string;
}) {
  const [vista, setVista] = useState<Vista>("dashboard");
  const [modal, setModal] = useState<null | "turno" | "cliente">(null);
  const [modalData, setModalData] = useState<{ fecha?: string }>({});

  // Acento del rubro (D4): coincide con var(--accent) que setea el island por
  // data-rubro; se pasa a los features (P6) que aún consumen el color por prop.
  const color = accentPorRubro(negocio.rubro);
  const icon = iconoRubro(negocio.rubro);

  const showToast = (msg: string) => {
    toast(msg, { duration: 3000 });
  };

  const abrirTurno = (fecha?: string) => {
    setModalData(fecha ? { fecha } : {});
    setModal("turno");
  };

  const estiloTab = (activo: boolean) =>
    cn(
      "cursor-pointer rounded-lg border-none px-3.5 py-2 text-xs transition-colors",
      activo
        ? "bg-accent/15 font-medium text-accent"
        : "bg-transparent text-muted-foreground",
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-14 flex-wrap items-center gap-4 border-b border-accent/15 bg-card px-5">
        <span className="text-[1.3rem]">{icon}</span>
        <span className="font-bold text-accent">{negocio.nombre}</span>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {negocio.rubro === "servicio_tecnico" ? (
            <>
              <button
                onClick={() => setVista("dashboard")}
                className={estiloTab(vista === "dashboard")}
              >
                📊 Dashboard
              </button>
              <a
                href={"/" + slug + "/reparaciones"}
                className="inline-flex items-center rounded-lg bg-accent/15 px-3.5 py-2 text-xs text-accent no-underline"
              >
                🔧 Reparaciones
              </a>
              <button
                onClick={() => setVista("gastos")}
                className={estiloTab(vista === "gastos")}
              >
                💸 Caja
              </button>
            </>
          ) : (
            <>
              {(
                [
                  ["dashboard", "📊 Dashboard"],
                  ["agenda", "📅 Agenda"],
                  ["clientes", "👥 Clientes"],
                  ["gastos", "💸 Caja"],
                ] as Array<[Vista, string]>
              ).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={estiloTab(vista === v)}
                >
                  {l}
                </button>
              ))}
              <a
                href={"/" + slug + "/reparaciones"}
                className="inline-flex items-center rounded-lg px-3.5 py-2 text-xs text-muted-foreground no-underline"
              >
                🔧 Reparaciones
              </a>
            </>
          )}
        </nav>
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="text-muted-foreground"
          >
            Salir
          </Button>
        </form>
      </div>

      <div className="mx-auto max-w-[960px] px-4 py-6">
        {vista === "dashboard" && (
          <DashboardResumen
            clientes={clientes}
            turnosHoy={turnosHoy}
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
            negocioNombre={negocio.nombre}
            turnos={turnos}
            hoy={hoy}
            color={color}
            onNuevoTurno={() => abrirTurno(hoy)}
            showToast={showToast}
          />
        )}

        {vista === "clientes" && (
          <ClientesLista
            slug={slug}
            clientes={clientes}
            negocioNombre={negocio.nombre}
            icon={icon}
            onNuevoCliente={() => {
              setModalData({});
              setModal("cliente");
            }}
            showToast={showToast}
          />
        )}

        {vista === "gastos" && (
          <GastosCaja
            slug={slug}
            gastos={gastos}
            ingresoMes={ingresoMes}
            gastosMes={gastosMes}
            hoy={hoy}
            color={color}
            showToast={showToast}
          />
        )}
      </div>

      {modal === "turno" && (
        <NuevoTurnoModal
          slug={slug}
          color={color}
          fechaInicial={modalData.fecha || hoy}
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
