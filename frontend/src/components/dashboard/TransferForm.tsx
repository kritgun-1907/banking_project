/**
 * @file TransferForm.tsx
 * @description The "Send Money" form inside the dashboard.
 *
 * How a real transaction flows through this website:
 *  1. User selects a "From Account" from the dropdown (populated from their accounts list).
 *  2. User types the destination account ID into "To Account ID".
 *     (In a real bank, this would be a payee lookup — here it's the raw MongoDB _id.)
 *  3. User enters the transfer amount in INR.
 *  4. On submit, the frontend generates a UUID idempotencyKey via crypto.randomUUID().
 *     This key is sent with the request so if the network drops and the user retries,
 *     the backend recognises the same key and returns the original result instead of
 *     processing the transfer twice (prevents double-charging).
 *  5. The backend validates: fields present, amount > 0, not self-transfer, accounts exist
 *     & active, sender has sufficient balance. If all pass, it opens a MongoDB session,
 *     creates a PENDING transaction + DEBIT/CREDIT ledger entries atomically, marks
 *     COMPLETED, commits. If anything fails, the session is aborted — no partial writes.
 *  6. The frontend shows a success/error modal with the transaction ID.
 */
"use client";

import React, { useState, FormEvent } from "react";
import { Send } from "lucide-react";
import Button from "@/components/ui/Button";
import Message from "@/components/ui/Message";
import { createTransaction } from "@/lib/api";
import { generateIdempotencyKey } from "@/lib/helpers";
import type { Account } from "@/lib/api";

interface TransferFormProps {
  /** List of the user's accounts (for the "From" dropdown) */
  accounts: Account[];
  /** Called after a successful transfer so the parent can refresh balances */
  onSuccess: (txnId: string) => void;
}

export default function TransferForm({ accounts, onSuccess }: TransferFormProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "error" as "error" | "success" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "error" });

    try {
      /**
       * IDEMPOTENCY KEY — generated fresh for every new transfer attempt.
       * If the user clicks "Transfer" again after a success, a NEW key is generated.
       * If the network fails and the form re-submits, the SAME form submission still
       * carries the same key (React state preserved) so the backend de-duplicates it.
       */
      const idempotencyKey = generateIdempotencyKey();

      const res = await createTransaction(
        from,
        to,
        parseFloat(amount),
        idempotencyKey
      );

      setMessage({ text: res.message, type: "success" });
      setTo("");
      setAmount("");
      onSuccess(res.transactionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* From Account (dropdown) */}
        <div className="relative">
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
            className="w-full appearance-none rounded-xl bg-surface-alt border border-border px-4 py-3.5 text-text outline-none transition-all duration-300 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]"
          >
            <option value="">Select source account</option>
            {accounts
              .filter((a) => a.status === "ACTIVE")
              .map((a) => (
                <option key={a._id} value={a._id}>
                  {a._id.slice(-6)} — {a.currency}
                </option>
              ))}
          </select>
          <label className="absolute -top-2.5 left-3 bg-surface-alt px-1 text-xs text-text-muted">
            From Account
          </label>
        </div>

        {/* To Account (text input) */}
        <div className="relative">
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Paste destination account ID"
            required
            className="w-full rounded-xl bg-surface-alt border border-border px-4 py-3.5 text-text placeholder:text-text-dim outline-none transition-all duration-300 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]"
          />
          <label className="absolute -top-2.5 left-3 bg-surface-alt px-1 text-xs text-text-muted">
            To Account ID
          </label>
        </div>
      </div>

      {/* Amount + Submit */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="relative flex-1 w-full">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="1"
            step="0.01"
            required
            className="w-full rounded-xl bg-surface-alt border border-border px-4 py-3.5 text-text placeholder:text-text-dim outline-none transition-all duration-300 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]"
          />
          <label className="absolute -top-2.5 left-3 bg-surface-alt px-1 text-xs text-text-muted">
            Amount (₹)
          </label>
        </div>
        <Button type="submit" disabled={loading} className="shrink-0">
          <Send size={16} />
          {loading ? "Sending…" : "Transfer"}
        </Button>
      </div>

      <Message text={message.text} type={message.type} />
    </form>
  );
}
