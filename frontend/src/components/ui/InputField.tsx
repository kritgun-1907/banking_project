/**
 * @file InputField.tsx
 * @description Floating-label input — light cream theme with warm gold focus ring.
 */
"use client";

import React from "react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function InputField({
  label,
  className = "",
  id,
  ...rest
}: InputFieldProps) {
  return (
    <div className={`relative mb-5 ${className}`}>
      <input
        id={id}
        placeholder=" "
        className="peer w-full rounded-xl bg-surface-alt border border-border px-4 pt-5 pb-2 text-(--color-text) outline-none transition-all duration-300 focus:border-accent focus:shadow-[0_0_0_3px_rgba(212,168,83,0.15)] hover:border-border-hover"
        {...rest}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted transition-all duration-200 peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-accent peer-not-placeholder-shown:top-2.5 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs"
      >
        {label}
      </label>
    </div>
  );
}
