/**
 * @file AdminDashboard.tsx
 * @description Super-admin dashboard for system users.
 *
 * Features:
 *  - Stats bar: total users, active accounts, transaction volume, system balance
 *  - Users table with expandable account rows and live balances
 *  - "Issue Funds" modal: select any account and send initial funds
 *  - Search / filter users by name or email
 */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  LogOut, RefreshCw, DollarSign, Users, CreditCard,
  Activity, ChevronDown, ChevronRight, Send, Search,
  ShieldCheck, AlertCircle,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import type { AdminUser, AdminStats } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4 border"
      style={{
        background: accent ? "var(--color-accent)" : "white",
        borderColor: accent ? "var(--color-accent)" : "var(--color-border)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
      }}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: accent ? "rgba(255,255,255,0.2)" : "rgba(212,168,83,0.1)",
          color: accent ? "white" : "var(--color-accent)",
        }}
      >
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium mb-0.5" style={{ color: accent ? "rgba(255,255,255,0.75)" : "var(--color-text-muted)" }}>
          {label}
        </p>
        <p className="text-xl font-bold" style={{ color: accent ? "white" : "var(--color-text)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: accent ? "rgba(255,255,255,0.6)" : "var(--color-text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Issue Funds Modal ─────────────────────────────────────────────────────────

interface IssueFundsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedAccountId?: string;
  preselectedUserName?: string;
  users: AdminUser[];
}

function IssueFundsModal({
  open, onClose, onSuccess, preselectedAccountId, preselectedUserName, users,
}: IssueFundsModalProps) {
  const [selectedAccount, setSelectedAccount] = useState(preselectedAccountId ?? "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedAccount(preselectedAccountId ?? "");
      setAmount("");
      setError("");
      setSuccess("");
    }
  }, [open, preselectedAccountId]);

  // Flat list of all accounts across all users for the dropdown
  const allAccounts = users.flatMap(u =>
    u.accounts.filter(a => a.status === "ACTIVE").map(a => ({
      accountId: a._id,
      label: `${u.name} — ${a._id.slice(-8).toUpperCase()} (${fmt(a.balance)})`,
    }))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const amt = parseFloat(amount);
    if (!selectedAccount) { setError("Please select an account"); return; }
    if (!amt || amt <= 0) { setError("Enter a valid positive amount"); return; }

    setLoading(true);
    try {
      const idempotencyKey = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await api.adminIssueFunds(selectedAccount, amt, idempotencyKey);
      setSuccess(`✅ ${fmt(amt)} issued successfully!`);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue funds");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-fade-in-up"
        style={{ border: "1px solid var(--color-border)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(212,168,83,0.1)" }}>
            <Send size={18} style={{ color: "var(--color-accent)" }} />
          </span>
          <div>
            <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Issue Initial Funds</h3>
            {preselectedUserName && (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>To: {preselectedUserName}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              Destination Account
            </label>
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            >
              <option value="">Select an account…</option>
              {allAccounts.map(a => (
                <option key={a.accountId} value={a.accountId}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                style={{ color: "var(--color-text-muted)" }}>₹</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="10,000"
                className="w-full rounded-xl border pl-7 pr-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
            </div>
            {/* Quick presets */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[1000, 5000, 10000, 50000].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:border-accent"
                  style={{
                    borderColor: amount === String(v) ? "var(--color-accent)" : "var(--color-border)",
                    background: amount === String(v) ? "rgba(212,168,83,0.08)" : "transparent",
                    color: "var(--color-text)",
                  }}
                >
                  {fmtShort(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Error / success */}
          {error && (
            <div className="flex items-center gap-2 text-sm p-3 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {success && (
            <div className="text-sm p-3 rounded-xl"
              style={{ background: "rgba(34,197,94,0.08)", color: "#16a34a" }}>
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" full onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" full disabled={loading}>
              {loading ? "Issuing…" : "Issue Funds"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onIssueFunds,
}: {
  user: AdminUser;
  onIssueFunds: (accountId: string, userName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalBalance = user.accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <>
      {/* User row */}
      <tr
        className="border-b cursor-pointer hover:bg-[rgba(212,168,83,0.03)] transition-colors"
        style={{ borderColor: "var(--color-border)" }}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "rgba(212,168,83,0.12)", color: "var(--color-accent)" }}>
              {user.name[0].toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{user.name}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {user.accounts.length} account{user.accounts.length !== 1 ? "s" : ""}
        </td>
        <td className="px-4 py-3 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {fmt(totalBalance)}
        </td>
        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {timeAgo(user.createdAt)}
        </td>
        <td className="px-4 py-3 text-right">
          <span style={{ color: "var(--color-text-muted)" }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </td>
      </tr>

      {/* Expanded accounts sub-rows */}
      {expanded && user.accounts.map(acc => (
        <tr
          key={acc._id}
          className="border-b"
          style={{ background: "rgba(250,248,245,0.6)", borderColor: "var(--color-border)" }}
        >
          <td className="px-4 py-2.5 pl-16">
            <div className="flex items-center gap-2">
              <CreditCard size={12} style={{ color: "var(--color-text-muted)" }} />
              <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                ···{acc._id.slice(-10).toUpperCase()}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: acc.status === "ACTIVE"
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(239,68,68,0.1)",
                  color: acc.status === "ACTIVE" ? "#16a34a" : "#dc2626",
                }}
              >
                {acc.status}
              </span>
            </div>
          </td>
          <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {acc.currency}
          </td>
          <td className="px-4 py-2.5 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {fmt(acc.balance)}
          </td>
          <td className="px-4 py-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {timeAgo(acc.createdAt)}
          </td>
          <td className="px-4 py-2.5 text-right">
            {acc.status === "ACTIVE" && (
              <button
                onClick={e => { e.stopPropagation(); onIssueFunds(acc._id, user.name); }}
                className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:border-accent hover:bg-[rgba(212,168,83,0.08)] cursor-pointer"
                style={{ borderColor: "var(--color-border)", color: "var(--color-accent)" }}
              >
                Issue Funds
              </button>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, handleLogout } = useAuth();

  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Issue funds modal state
  const [modal, setModal] = useState({
    open: false,
    accountId: "",
    userName: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetStats(),
      ]);
      setUsers(usersRes.users);
      setStats(statsRes.stats);
    } catch {
      /* silently fail — user will see empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

      {/* ── Top Nav ────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 py-4 md:px-12"
        style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: "rgba(212,168,83,0.12)", color: "var(--color-accent)" }}>
            <ShieldCheck size={11} /> ADMIN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:border-accent cursor-pointer"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <Button variant="ghost" sm onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10 md:px-12">

        {/* ── Page heading ─────────────────────────────────────────────── */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--color-text)" }}>
            System Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Logged in as <strong>{user.email}</strong> · Super Admin
          </p>
        </div>

        {/* ── Stats cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <StatCard
            icon={<Users size={18} />}
            label="Total Users"
            value={stats ? String(stats.totalUsers) : "—"}
            sub="Registered accounts"
          />
          <StatCard
            icon={<CreditCard size={18} />}
            label="Active Accounts"
            value={stats ? String(stats.activeAccounts) : "—"}
            sub="Bank accounts open"
          />
          <StatCard
            icon={<Activity size={18} />}
            label="Transactions"
            value={stats ? String(stats.totalTransactions) : "—"}
            sub={stats ? `Volume ${fmtShort(stats.totalVolume)}` : "Total completed"}
          />
          <StatCard
            icon={<DollarSign size={18} />}
            label="System Balance"
            value={stats ? fmtShort(stats.systemBalance) : "—"}
            sub="Reserve account"
            accent
          />
        </div>

        {/* ── Users table ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-white overflow-hidden animate-fade-in-up"
          style={{ borderColor: "var(--color-border)", boxShadow: "0 2px 24px rgba(0,0,0,0.04)", animationDelay: "0.1s" }}>

          {/* Table header row */}
          <div className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "var(--color-border)" }}>
            <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
              All Users ({filtered.length})
            </h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-xl border text-sm outline-none transition-all w-56"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-bg)",
                    color: "var(--color-text)",
                  }}
                />
              </div>
              <Button sm onClick={() => setModal({ open: true, accountId: "", userName: "" })}>
                <Send size={12} /> Issue Funds
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--color-accent) transparent var(--color-accent) var(--color-accent)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20"
              style={{ color: "var(--color-text-muted)" }}>
              <Users size={32} className="mb-3 opacity-30" />
              <p className="text-sm">{search ? "No users match your search" : "No users yet"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                    {["User", "Accounts", "Total Balance", "Joined", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                        style={{ color: "var(--color-text-muted)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <UserRow
                      key={u._id}
                      user={u}
                      onIssueFunds={(accountId, userName) =>
                        setModal({ open: true, accountId, userName })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Issue Funds Modal ──────────────────────────────────────────── */}
      <IssueFundsModal
        open={modal.open}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onSuccess={load}
        preselectedAccountId={modal.accountId}
        preselectedUserName={modal.userName}
        users={users}
      />
    </div>
  );
}
