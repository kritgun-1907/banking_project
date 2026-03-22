/**
 * @file Button.tsx
 * @description Reusable button component with multiple visual variants.
 *              Supports primary (gradient), ghost (outlined), and disabled states.
 */
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: "primary" | "ghost";
  /** Full width */
  full?: boolean;
  /** Small size */
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
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none";

  const sizes = sm ? "px-4 py-1.5 text-xs" : "px-6 py-3 text-sm";

  const variants = {
    primary:
      "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_30px_var(--color-primary-glow)]",
    ghost:
      "bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
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
