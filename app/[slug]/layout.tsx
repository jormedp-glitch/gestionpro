// app/[slug]/layout.tsx
//
// Layout FINO del segmento [slug] (D1): usa `getNegocioBySlug` (público,
// devuelve null) — NUNCA `requireNegocio`/`requireMembership` — porque
// `[slug]/seguimiento/[orden]` es una ruta PÚBLICA (token D-11) y un layout
// con guard de membresía la rompería (descubrimiento #187). Los guards de
// auth siguen viviendo en cada page.
//
// D2: `{children}` se renderiza directo; RubroAccentSetter es una island
// que devuelve null (no envuelve) para preservar el estado client
// (vista/modal/toast) de NegocioShell.

import type { Metadata } from "next";
import { getNegocioBySlug } from "@/lib/server/negocio";
import { RubroAccentSetter } from "@/components/rubro-accent-setter";
import { DEFAULT_RUBRO } from "@/lib/ui/theme";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await getNegocioBySlug(slug);
  return { title: negocio?.nombre ?? "GestiónPro" };
}

export default async function NegocioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await getNegocioBySlug(slug);
  return (
    <>
      <RubroAccentSetter rubro={negocio?.rubro ?? DEFAULT_RUBRO} />
      {children}
    </>
  );
}
