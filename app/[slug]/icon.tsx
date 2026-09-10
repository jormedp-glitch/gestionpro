// app/[slug]/icon.tsx
//
// Favicon dinámico por negocio (REQ-BM-2, D5): ImageResponse (next/og) que
// renderiza la inicial del negocio sobre el acento del rubro. satori no lee
// CSS vars, por eso consume el mapa espejo RUBRO_ACCENT (lib/ui/theme.ts,
// con test de sync). params es Promise en Next 16 (docs locales app-icons.md).

import { ImageResponse } from "next/og";
import { getNegocioBySlug } from "@/lib/server/negocio";
import { accentPorRubro, DEFAULT_RUBRO } from "@/lib/ui/theme";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await getNegocioBySlug(slug);
  const accent = accentPorRubro(negocio?.rubro ?? DEFAULT_RUBRO);
  const inicial =
    (negocio?.nombre ?? "G").trim().charAt(0).toUpperCase() || "G";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: accent,
        color: "#ffffff",
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      {inicial}
    </div>,
    { ...size },
  );
}
