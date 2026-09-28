// app/[slug]/usuarios/page.tsx
//
// Gestión de usuarios del negocio — Server Component (spec R2/R6, design D3).
// Orden de guards: requireNegocio (sesión + membresía) → requireOwner (rol
// owner) → recién ahí se leen los miembros. Los editores y no-miembros
// redirigen ANTES de disparar la lectura (R6: superficie invisible e
// inejecutable, sin fuga de datos). requireOwner devuelve el usuario de la
// sesión, que sirve para marcar la propia fila en la UI. Issue #183: header
// compartido arriba del contenido (la ruta vive fuera del shell).

import { requireOwner } from "@/lib/auth/dal";
import { requireNegocio } from "@/lib/server/negocio";
import { NegocioHeader } from "@/features/admin/components/NegocioHeader";
import { getMiembrosDeNegocio } from "@/features/miembros/data/miembros";
import { UsuariosPage } from "@/features/miembros/components/UsuariosPage";

export default async function UsuariosRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await requireNegocio(slug);
  const usuario = await requireOwner(negocio.id);
  const miembros = await getMiembrosDeNegocio(negocio.id);

  return (
    <>
      {/* requireOwner ya garantizó el rol: esOwner es true por construcción
          del guard (no se repiten las consultas de sesión/rol). */}
      <NegocioHeader slug={slug} negocio={negocio} esOwner activa="usuarios" />
      <UsuariosPage
        slug={slug}
        miembros={miembros}
        usuarioActualId={usuario.id}
      />
    </>
  );
}
