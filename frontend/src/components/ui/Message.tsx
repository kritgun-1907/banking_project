/**
 * @file Message.tsx
 * @description Inline status message (success / error) shown below forms.
 *              Displays nothing when text is empty — safe to always render.
 */
import React from "react";

interface MessageProps {
  text: string;
  type?: "success" | "error";
}

export default function Message({ text, type = "error" }: MessageProps) {
  if (!text) return null;

  const colors =
    type === "success"
      ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
      : "bg-[var(--color-error-soft)] text-[var(--color-error)]";

  return (
    <p className={`mt-3 rounded-lg px-4 py-2 text-sm font-medium ${colors}`}>
      {text}
    </p>
  );
}
