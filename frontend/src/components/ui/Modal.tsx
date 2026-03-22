/**
 * @file Modal.tsx
 * @description Overlay modal for success/error feedback.
 *              Renders a centered card with icon, title, body, and close button.
 *              Clicking the overlay background also closes it.
 */
"use client";

import React from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import Button from "./Button";

interface ModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when the user closes the modal */
  onClose: () => void;
  /** "success" shows a green check, "error" shows a red alert */
  type?: "success" | "error";
  /** Heading text */
  title: string;
  /** Body text */
  body: string;
}

export default function Modal({
  open,
  onClose,
  type = "success",
  title,
  body,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-muted hover:text-(--color-text) transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          {type === "success" ? (
            <CheckCircle size={56} className="text-success" />
          ) : (
            <AlertCircle size={56} className="text-error" />
          )}
        </div>

        <h2 className="mb-2 text-xl font-bold text-(--color-text)">{title}</h2>
        <p className="mb-6 text-sm text-text-muted">{body}</p>

        <Button onClick={onClose} className="mx-auto">
          Done
        </Button>
      </div>
    </div>
  );
}
