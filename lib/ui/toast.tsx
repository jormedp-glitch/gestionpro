// lib/ui/toast.tsx
//
// Primitiva Toast client (REQ-UP-1) sobre sonner 2.0.8 (D3). Cumple REQ-UP-2:
// los toasts se anuncian en una región aria-live (sonner expone
// aria-live="polite") y se cierran con un botón de nombre accesible
// ("Cerrar", vía toastOptions.closeButtonAriaLabel). Estilo por tokens
// (REQ-TT-3); el aria-label del contenedor es español neutro.

"use client";

import * as React from "react";
import { Toaster as SonnerToaster, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      closeButton
      customAriaLabel="Notificaciones"
      toastOptions={{
        closeButtonAriaLabel: "Cerrar",
        classNames: {
          toast: "bg-card text-card-foreground border shadow-md",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
