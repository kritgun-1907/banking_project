/**
 * @file HeroSection.tsx
 * @description Full-viewport parallax hero with animated gradient overlay,
 *              headline, subtitle, and CTA button. Uses Intersection Observer
 *              for scroll-driven parallax effect on the background layer.
 */
"use client";

import React, { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";

interface HeroProps {
  /** Navigate to register form */
  onGetStarted: () => void;
  /** Navigate to login form */
  onLogin: () => void;
}

export default function HeroSection({ onGetStarted, onLogin }: HeroProps) {
  const bgRef = useRef<HTMLDivElement>(null);

  /* ── Parallax scroll effect ──────────────────────────────────────────── */
  useEffect(() => {
    function handleScroll() {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `translateY(${y * 0.35}px) scale(1.1)`;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      {/* ── Parallax Background ──────────────────────────────────────────── */}
      <div
        ref={bgRef}
        className="absolute inset-0 -z-20 scale-110"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(124,106,255,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(167,139,250,0.1) 0%, transparent 50%)",
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-bg/60 to-bg" />

      {/* ── Navigation Bar ───────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 animate-fade-in">
        <Logo />
        <div className="flex items-center gap-3">
          <Button variant="ghost" sm onClick={onLogin}>
            Login
          </Button>
          <Button sm onClick={onGetStarted}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* ── Hero Content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-in-up">
        <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-6">
          Banking.
          <br />
          <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Reimagined.
          </span>
        </h1>
        <p className="max-w-xl text-lg text-text-muted mb-10 leading-relaxed">
          Secure ledger-based transactions, real-time balances, and
          enterprise-grade security — all in a minimalist experience.
        </p>
        <Button
          className="px-10 py-4 text-base"
          onClick={onGetStarted}
        >
          Open Your Account
        </Button>
      </div>

      {/* ── Scroll Indicator ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pb-10 animate-scroll-hint">
        <span className="text-xs text-text-dim mb-2 tracking-widest uppercase">
          Scroll to explore
        </span>
        <ChevronDown size={20} className="text-text-dim" />
      </div>
    </div>
  );
}
