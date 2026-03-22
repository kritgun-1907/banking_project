/**
 * @file page.tsx
 * @description Root page — SPA with Landing, Auth, and Dashboard views.
 *              Landing page includes HeroSection, FeaturesSection, and a rich Footer.
 */
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import Footer from "@/components/landing/Footer";
import AuthForms from "@/components/auth/AuthForms";
import DashboardView from "@/components/dashboard/DashboardView";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

type View = "landing" | "register" | "login" | "dashboard";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<View>("landing");

  useEffect(() => {
    if (isLoading) return; // wait for /me check before deciding view
    if (user) {
      setView("dashboard");
    } else if (view === "dashboard") {
      // user was logged out
      setView("landing");
    }
  }, [user, isLoading]);

  /* ── Loading gate: prevents flash of landing for authenticated users ─ */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-accent) transparent var(--color-accent) var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Restoring session…</p>
        </div>
      </div>
    );
  }

  /* ── Dashboard — route by user role ─────────────────────────────────── */
  if (view === "dashboard") {
    return user?.systemUser ? <AdminDashboard /> : <DashboardView />;
  }

  /* ── Auth Forms ────────────────────────────────────────────────────── */
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
      <Footer />
    </main>
  );
}
