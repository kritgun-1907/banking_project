/**
 * @file Button.tsx
 * @description Reusable button with Apple-inspired design.
 *              Primary: dark pill with gold hover glow. Ghost: bordered.
 *              Vibrant hover effects on all variants.
 */
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  full?: boolean;
  sm?: boolean;
}

export default function Button({
  variant = "primary",
  full = false,
  sm = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 ease-out";

  const sizes = sm ? "px-5 py-2 text-xs" : "px-7 py-3.5 text-sm";

  const variants = {
    primary:
      "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-accent)] hover:shadow-[0_8px_30px_rgba(212,168,83,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
    ghost:
      "bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:-translate-y-0.5 active:translate-y-0",
  };

  return (
    <button
      className={`${base} ${sizes} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
