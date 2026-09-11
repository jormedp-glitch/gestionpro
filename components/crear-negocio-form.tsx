"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/lib/ui/button";
import { Card } from "@/lib/ui/card";
import { Input } from "@/lib/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/ui/select";

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
    <Card className="mb-8 p-6">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Nombre del negocio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="min-w-[150px] flex-1"
        />
        <Input
          placeholder="slug (ej: gym-el-oso)"
          value={slug}
          onChange={(e) => setSlug(slugSeguro(e.target.value))}
          className="min-w-[150px] flex-1"
        />
        <Select value={rubro} onValueChange={setRubro}>
          <SelectTrigger className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RUBROS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={crearNegocio}
          disabled={creando}
          variant="accent"
          className="font-bold"
        >
          {creando ? "Creando..." : "Crear"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
    </Card>
  );
}
