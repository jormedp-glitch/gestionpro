// lib/ui/input.tsx
//
// Primitiva Input client (REQ-UP-1). DEVIACIÓN D8 documentada: Radix no tiene
// Input, por lo que esta isla es un <input> nativo estilizado con tokens y
// forwardRef (el ref se reenvía al elemento nativo). Clasificada "use client"
// según REQ-UP-1 (islas client: Input, Select, Dialog, Toast).
// Variantes con cva + cn (patrón del diseño); sin hex ni estilos inline
// (REQ-TT-3).

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const inputVariants = cva(
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        accent: "focus-visible:ring-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface InputProps
  extends
    React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, variant, type, ...props }, ref) {
    return (
      <input
        type={type ?? "text"}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
