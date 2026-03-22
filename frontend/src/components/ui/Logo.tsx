/**
 * @file Logo.tsx
 * @description Shared logo component used in the navbar and auth pages.
 *              Renders "KTG" in white and "-LEDGER" in primary accent colour.
 */
import React from "react";

interface LogoProps {
  /** Optional extra Tailwind classes */
  className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <span
      className={`font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight select-none ${className}`}
    >
      KTG<span className="text-[var(--color-primary)]">-LEDGER</span>
    </span>
  );
}
