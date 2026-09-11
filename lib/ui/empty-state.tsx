// lib/ui/empty-state.tsx
//
// Primitiva EmptyState server-safe (REQ-UP-1): estado vacío de listados
// (REQ-FS-2) con título, descripción opcional y acción opcional (p. ej. un
// Button "crear"). Sin "use client"; tokens muted/foreground.

import * as React from "react";
import { cn } from "./utils";

export interface EmptyStateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-muted/40 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {action ? <div className="mb-2">{action}</div> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
