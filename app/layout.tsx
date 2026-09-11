import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GestiónPro",
    template: "%s | GestiónPro",
  },
  description:
    "GestiónPro: clientes, turnos, gastos y reparaciones para tu negocio.",
};

// Contrato Next 16.2.2 (REQ-BM-1): viewport va en export SEPARADO, no
// dentro de metadata (docs locales generate-viewport.md). themeColor usa el
// acento default (gimnasio) del token --accent.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF6B35",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
