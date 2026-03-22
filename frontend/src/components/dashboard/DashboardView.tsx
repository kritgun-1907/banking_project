/**
 * @file DashboardView.tsx
 * @description Main dashboard layout shown after login.
 *
 * Sections:
 *  1. Top nav with username and logout button
 *  2. Greeting banner
 *  3. Accounts grid (fetched on mount + after creating a new account)
 *  4. Transfer form (Send Money)
 *
 * On successful transfer, a Modal appears and all balances refresh.
 */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { LogOut, Plus } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import AccountCard from "./AccountCard";
import TransferForm from "./TransferForm";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import type { Account } from "@/lib/api";
import { getGreeting } from "@/lib/helpers";

export default function DashboardView() {
  const { user, handleLogout } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  /* Modal state for transaction feedback */
  const [modal, setModal] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    body: "",
  });

  /* Increment this to force AccountCard balance re-fetch */
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Fetch accounts ────────────────────────────────────────────────── */
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAccounts();
      setAccounts(res.accounts);
    } catch {
      /* logged out or network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /* ── Create new account ────────────────────────────────────────────── */
  async function handleCreateAccount() {
    setCreating(true);
    try {
      await api.createAccount();
      await fetchAccounts();
    } catch {
      /* handle error silently */
    } finally {
      setCreating(false);
    }
  }

  /* ── Transfer success callback ─────────────────────────────────────── */
  function handleTransferSuccess(txnId: string) {
    setModal({
      open: true,
      type: "success",
      title: "Transfer Complete!",
      body: `Transaction ID: ${txnId}`,
    });
    // Force all account cards to re-fetch their balance
    setRefreshKey((k) => k + 1);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Top Navigation ───────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/80 backdrop-blur-md px-6 py-4 md:px-12">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-sm text-text-muted">
            {user.email}
          </span>
          <Button variant="ghost" sm onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10 md:px-12">
        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl md:text-4xl font-bold mb-1">
            {getGreeting(user.name)}
          </h1>
          <p className="text-text-muted">
            Here&apos;s your financial overview at a glance.
          </p>
        </div>

        {/* ── Accounts Section ─────────────────────────────────────────── */}
        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Your Accounts</h2>
            <Button sm onClick={handleCreateAccount} disabled={creating}>
              <Plus size={14} /> {creating ? "Creating…" : "New Account"}
            </Button>
          </div>

          {loading ? (
            /* Skeleton loaders */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-2xl bg-surface border border-border"
                />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-text-muted mb-4">
                No accounts yet. Create one to get started!
              </p>
              <Button onClick={handleCreateAccount} disabled={creating}>
                <Plus size={16} /> Create Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" key={refreshKey}>
              {accounts.map((acc) => (
                <AccountCard key={acc._id} account={acc} />
              ))}
            </div>
          )}
        </section>

        {/* ── Transfer Section ─────────────────────────────────────────── */}
        {accounts.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-xl font-semibold mb-6">Send Money</h2>
            <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
              <TransferForm
                accounts={accounts}
                onSuccess={handleTransferSuccess}
              />
            </div>
          </section>
        )}
      </main>

      {/* ── Success Modal ──────────────────────────────────────────────── */}
      <Modal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        type={modal.type}
        title={modal.title}
        body={modal.body}
      />
    </div>
  );
}
