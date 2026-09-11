// lib/ui/skeleton.tsx
//
// Primitiva Skeleton server-safe (REQ-UP-1): placeholder de carga con
// animate-pulse sobre token bg-muted. Sin "use client".

import * as React from "react";
import { cn } from "./utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
