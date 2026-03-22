/**
 * @file InputField.tsx
 * @description Floating-label input with focus ring animation.
 *              Works with text, email, password, and number types.
 */
"use client";

import React from "react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** The label text shown inside the field */
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
        className="peer w-full rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-4 pt-5 pb-2 text-[var(--color-text)] outline-none transition-all duration-300 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-soft)]"
        {...rest}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-all duration-200 peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[var(--color-primary)] peer-not-placeholder-shown:top-2.5 peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:text-xs"
      >
        {label}
      </label>
    </div>
  );
}
