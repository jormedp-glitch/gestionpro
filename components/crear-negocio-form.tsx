"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const RUBROS = [
  { value: "gimnasio", label: "Gimnasio" },
  { value: "peluqueria", label: "Peluquería" },
  { value: "veterinaria", label: "Veterinaria" },
  { value: "servicio_tecnico", label: "Servicio Técnico" },
];

function slugSeguro(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Formulario de alta de negocio. El alta pasa EXCLUSIVAMENTE por el RPC
 * security definer crear_negocio_con_owner (owner atómico; D-04: no existe
 * policy de insert en negocios).
 */
export default function CrearNegocioForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [rubro, setRubro] = useState("gimnasio");
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  async function crearNegocio() {
    if (!nombre.trim() || !slug.trim()) {
      setError("Complete el nombre y el slug del negocio");
      return;
    }
    setCreando(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("crear_negocio_con_owner", {
      p_nombre: nombre.trim(),
      p_slug: slug.trim(),
      p_rubro: rubro,
    });

    setCreando(false);

    if (rpcError) {
      setError(
        "No se pudo crear el negocio. Verifique que el slug no esté en uso.",
      );
      return;
    }

    setNombre("");
    setSlug("");
    setRubro("gimnasio");
    router.refresh();
  }

  return (
    <div
      style={{
        background: "#13131A",
        border: "1px solid #ffffff10",
        borderRadius: "16px",
        padding: "1.5rem",
        marginBottom: "2rem",
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          placeholder="Nombre del negocio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{
            background: "#1E1E28",
            border: "1px solid #333",
            color: "#fff",
            borderRadius: "8px",
            padding: "0.65rem 1rem",
            flex: 1,
            minWidth: "150px",
          }}
        />
        <input
          placeholder="slug (ej: gym-el-oso)"
          value={slug}
          onChange={(e) => setSlug(slugSeguro(e.target.value))}
          style={{
            background: "#1E1E28",
            border: "1px solid #333",
            color: "#fff",
            borderRadius: "8px",
            padding: "0.65rem 1rem",
            flex: 1,
            minWidth: "150px",
          }}
        />
        <select
          value={rubro}
          onChange={(e) => setRubro(e.target.value)}
          style={{
            background: "#1E1E28",
            border: "1px solid #333",
            color: "#fff",
            borderRadius: "8px",
            padding: "0.65rem 1rem",
          }}
        >
          {RUBROS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          onClick={crearNegocio}
          disabled={creando}
          style={{
            background: "#FF6B35",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            padding: "0.65rem 1.5rem",
            cursor: "pointer",
            fontWeight: 700,
            opacity: creando ? 0.6 : 1,
          }}
        >
          {creando ? "Creando..." : "Crear"}
        </button>
      </div>
      {error && (
        <p
          style={{ color: "#FF6B35", marginTop: "0.75rem", fontSize: "0.9rem" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
