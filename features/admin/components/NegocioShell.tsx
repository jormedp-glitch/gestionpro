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
import type { Negocio } from "@/lib/auth/dal";
import type { Cliente } from "@/features/clientes/data/clientes";
import type { Turno } from "@/features/turnos/data/turnos";
import type { Gasto } from "@/features/gastos/data/gastos";

type Vista = "dashboard" | "agenda" | "clientes" | "gastos";

function colorRubro(rubro: string): string {
  if (rubro === "peluqueria") return "#A78BFA";
  if (rubro === "veterinaria") return "#34D399";
  if (rubro === "servicio_tecnico") return "#60A5FA";
  return "#FF6B35";
}

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
  const [toast, setToast] = useState<string | null>(null);

  const color = colorRubro(negocio.rubro);
  const icon = iconoRubro(negocio.rubro);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const abrirTurno = (fecha?: string) => {
    setModalData(fecha ? { fecha } : {});
    setModal("turno");
  };

  const estiloTab = (activo: boolean): React.CSSProperties => ({
    background: activo ? color + "20" : "none",
    color: activo ? color : "#666",
    border: "none",
    cursor: "pointer",
    padding: ".5rem .9rem",
    borderRadius: "8px",
    fontSize: ".82rem",
    fontFamily: "sans-serif",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0F",
        fontFamily: "sans-serif",
        color: "#fff",
      }}
    >
      <div
        style={{
          background: "#13131A",
          borderBottom: `1px solid ${color}20`,
          padding: "0 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          minHeight: "56px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
        <span style={{ color, fontWeight: 700 }}>{negocio.nombre}</span>
        <nav
          style={{
            display: "flex",
            gap: ".25rem",
            flex: 1,
            overflowX: "auto",
          }}
        >
          {negocio.rubro === "servicio_tecnico" ? (
            <>
              <button
                onClick={() => setVista("dashboard")}
                style={estiloTab(vista === "dashboard")}
              >
                📊 Dashboard
              </button>
              <a
                href={"/" + slug + "/reparaciones"}
                style={{
                  color: "#60A5FA",
                  padding: ".5rem .9rem",
                  borderRadius: "8px",
                  fontSize: ".82rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#60A5FA20",
                }}
              >
                🔧 Reparaciones
              </a>
              <button
                onClick={() => setVista("gastos")}
                style={estiloTab(vista === "gastos")}
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
                  style={estiloTab(vista === v)}
                >
                  {l}
                </button>
              ))}
              <a
                href={"/" + slug + "/reparaciones"}
                style={{
                  color: "#666",
                  padding: ".5rem .9rem",
                  borderRadius: "8px",
                  fontSize: ".82rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                🔧 Reparaciones
              </a>
            </>
          )}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid #ffffff18",
              color: "#888",
              borderRadius: "8px",
              padding: ".5rem .9rem",
              fontSize: ".82rem",
              cursor: "pointer",
              fontFamily: "sans-serif",
            }}
          >
            Salir
          </button>
        </form>
      </div>

      <div
        style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1rem" }}
      >
        {vista === "dashboard" && (
          <DashboardResumen
            clientes={clientes}
            turnosHoy={turnosHoy}
            activos={activos}
            ingresoMes={ingresoMes}
            gastosMes={gastosMes}
            hoy={hoy}
            color={color}
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
            color={color}
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
          color={color}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            background: "#13131A",
            border: "1px solid #ffffff15",
            borderRadius: "12px",
            padding: ".7rem 1.2rem",
            fontSize: ".85rem",
            zIndex: 200,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
