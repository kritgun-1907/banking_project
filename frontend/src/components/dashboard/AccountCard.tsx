/**
 * @file AccountCard.tsx
 * @description A single account card showing status, currency, and live balance.
 *              Fetches balance on mount and exposes a refresh method.
 *              Glows with a subtle pulse animation when active.
 */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Wallet, RefreshCw } from "lucide-react";
import { getBalance } from "@/lib/api";
import { formatCurrency, truncateId } from "@/lib/helpers";
import type { Account } from "@/lib/api";

interface AccountCardProps {
  account: Account;
  /** Whether this card is currently selected for transfers */
  selected?: boolean;
  /** Called when user clicks the card to select it */
  onSelect?: () => void;
}

export default function AccountCard({
  account,
  selected = false,
  onSelect,
}: AccountCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch balance from the backend */
  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBalance(account._id);
      setBalance(res.balance);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [account._id]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const statusColors: Record<string, string> = {
    ACTIVE: "text-success bg-success-soft",
    FROZEN: "text-yellow-400 bg-yellow-400/10",
    CLOSED: "text-error bg-error-soft",
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${
        selected
          ? "border-primary bg-primary-soft shadow-[0_0_30px_var(--color-primary-glow)]"
          : "border-border bg-surface hover:border-border-hover hover:shadow-lg"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt">
          <Wallet size={20} className="text-primary" />
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[account.status] ?? ""}`}
        >
          {account.status}
        </span>
      </div>

      {/* Balance */}
      <div className="mb-3">
        <p className="text-xs text-text-dim uppercase tracking-wider mb-1">
          Balance
        </p>
        {loading ? (
          <div className="h-8 w-32 animate-pulse rounded-lg bg-surface-alt" />
        ) : (
          <p className="text-2xl font-bold tracking-tight">
            {balance !== null ? formatCurrency(balance) : "—"}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-dim font-mono">
          {truncateId(account._id)}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchBalance();
          }}
          className="text-text-dim hover:text-primary transition-colors cursor-pointer"
          title="Refresh balance"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Currency badge */}
      <div className="absolute right-6 top-16 text-6xl font-bold text-text-dim/5 select-none">
        {account.currency}
      </div>
    </div>
  );
}
