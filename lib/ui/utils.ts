// lib/ui/utils.ts
//
// Helper `cn` compartido por las primitivas (patrón del diseño: cva + clsx +
// tailwind-merge). Centraliza clsx(...) + twMerge(...) para que cada primitiva
// resuelva variantes y clases de usuario sin conflictos de orden.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
