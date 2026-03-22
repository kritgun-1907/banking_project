/**
 * @file HeroSection.tsx
 * @description Full-viewport hero section with Apple-inspired cream UI.
 *              Features a banking overlay image, bold display heading
 *              ("Expert Banking" style), parallax scroll, CTA buttons,
 *              and scroll indicator.
 */
"use client";

import React, { useEffect, useRef } from "react";
import { ChevronDown, Clipboard, LogIn } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";

interface HeroProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function HeroSection({ onGetStarted, onLogin }: HeroProps) {
  const bgRef = useRef<HTMLDivElement>(null);

  /* ── Parallax scroll effect ──────────────────────────────────────────── */
  useEffect(() => {
    function handleScroll() {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `translateY(${y * 0.25}px)`;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-bg">
      {/* ── Parallax Background — banking overlay image ──────────────── */}
      <div
        ref={bgRef}
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.08,
        }}
      />
      {/* Warm gradient overlay */}
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-bg via-bg/90 to-bg" />

      {/* ── Navigation Bar ───────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 animate-fade-in">
        <Logo />
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-text-muted hover:text-(--color-text) transition-colors">Home</a>
          <a href="#showcase" className="text-sm text-text-muted hover:text-(--color-text) transition-colors">About Us</a>
          <a href="#footer" className="text-sm text-text-muted hover:text-(--color-text) transition-colors">Contact</a>
        </div>
        <Button sm onClick={onLogin}>
          <LogIn size={14} /> Sign In
        </Button>
      </nav>

      {/* ── Hero Content — "Expert Hair Dresser" inspired layout ──── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-in-up">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-white/60 backdrop-blur-sm px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          <span className="text-accent">✦</span>
          Premium Digital Banking
        </div>

        {/* Main Heading — bold, black, massive */}
        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold leading-[0.95] tracking-tight mb-2">
          Expert
        </h1>
        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl font-bold leading-[0.95] tracking-tight mb-4">
          Banking
        </h1>
        {/* Gold underline accent */}
        <div className="w-48 md:w-64 h-1 bg-accent rounded-full mb-8" />

        <p className="max-w-lg text-base md:text-lg text-text-muted mb-10 leading-relaxed">
          Book transactions, process payments, and track your ledger&apos;s
          performance — all in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4">
          <Button className="px-8 py-4 text-sm" onClick={onGetStarted}>
            <Clipboard size={16} /> Get Started
          </Button>
          <Button variant="ghost" className="px-8 py-4 text-sm" onClick={onLogin}>
            <LogIn size={16} /> Sign In
          </Button>
        </div>
      </div>

      {/* ── Scroll Indicator ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center pb-10 animate-scroll-hint">
        <span className="text-xs text-text-dim mb-2 tracking-widest uppercase">
          Scroll to explore
        </span>
        <ChevronDown size={20} className="text-text-dim" />
      </div>
    </div>
  );
}
