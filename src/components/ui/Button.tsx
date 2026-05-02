"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "@/lib/util";

type Variant = "primary" | "ghost" | "outline" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 disabled:opacity-50 shadow-glow",
  ghost: "text-text hover:bg-bg-raised",
  outline:
    "border border-line text-text hover:bg-bg-raised hover:border-accent/50",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
  subtle: "bg-bg-raised text-text hover:bg-bg-raised/70 border border-line",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "outline", size = "md", active, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-accent/40",
        variants[variant],
        sizes[size],
        active && "ring-1 ring-accent",
        className,
      )}
    >
      {children}
    </button>
  );
});
