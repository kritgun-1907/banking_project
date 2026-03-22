/**
 * @file page.tsx
 * @description Root page component — the single "page" of this SPA.
 *
 * Renders three mutually exclusive views based on app state:
 *  1. **Landing** — shown when no user is logged in and no auth form is active.
 *  2. **Auth**    — shown when user clicks Login/Register from the landing page.
 *  3. **Dashboard** — shown when `user` is set in AuthContext (after login/register).
 *
 * View transitions are managed by a simple `view` state string.
 * When `user` becomes non-null (login/register success), we always show Dashboard.
 * When `user` becomes null (logout), we always show Landing.
 */
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import AuthForms from "@/components/auth/AuthForms";
import DashboardView from "@/components/dashboard/DashboardView";

type View = "landing" | "register" | "login" | "dashboard";

export default function HomePage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("landing");

  /**
   * Whenever `user` changes:
   * - If user is set → show dashboard (login/register success)
   * - If user is null → show landing (logout or initial load)
   */
  useEffect(() => {
    if (user) {
      setView("dashboard");
    } else {
      setView("landing");
    }
  }, [user]);

  /* ── Dashboard ─────────────────────────────────────────────────────── */
  if (view === "dashboard") {
    return <DashboardView />;
  }

  /* ── Auth Forms (Register / Login) ─────────────────────────────────── */
  if (view === "register" || view === "login") {
    return (
      <AuthForms
        initialForm={view}
        onBack={() => setView("landing")}
      />
    );
  }

  /* ── Landing Page ──────────────────────────────────────────────────── */
  return (
    <main>
      <HeroSection
        onGetStarted={() => setView("register")}
        onLogin={() => setView("login")}
      />
      <FeaturesSection />

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10 text-center">
        <p className="text-sm text-text-dim">
          © {new Date().getFullYear()} KTG-LEDGER. Built with double-entry
          bookkeeping principles.
        </p>
      </footer>
    </main>
  );
}
