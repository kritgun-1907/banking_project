/**
 * @file Logo.tsx
 * @description Shared logo component — "KTG" in bold black, "-LEDGER" in warm gold accent.
 *              Apple-inspired minimal branding.
 */
import React from "react";

interface LogoProps {
  /** Optional extra Tailwind classes */
  className?: string;
  /** Show larger variant for hero sections */
  large?: boolean;
}

export default function Logo({ className = "", large = false }: LogoProps) {
  return (
    <span
      className={`font-display ${large ? "text-4xl" : "text-2xl"} font-bold tracking-tight select-none ${className}`}
    >
      KTG<span className="text-accent">-LEDGER</span>
    </span>
  );
}
