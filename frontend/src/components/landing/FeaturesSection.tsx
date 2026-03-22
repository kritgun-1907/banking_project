/**
 * @file FeaturesSection.tsx
 * @description "Why KTG-LEDGER?" section with four framed feature cards.
 *              Each card fades in when it enters the viewport using
 *              Intersection Observer (no external library needed).
 */
"use client";

import React, { useEffect, useRef } from "react";
import { Shield, BookOpen, Zap, Key } from "lucide-react";

/** Feature data — icon, title, description */
const FEATURES = [
  {
    icon: Shield,
    title: "Bank-Grade Security",
    desc: "JWT authentication, token blacklisting, httpOnly cookies, and bcrypt hashing protect every interaction.",
  },
  {
    icon: BookOpen,
    title: "Double-Entry Ledger",
    desc: "Every transaction creates matching DEBIT and CREDIT entries. Your balance is always provably correct.",
  },
  {
    icon: Zap,
    title: "Atomic Transactions",
    desc: "MongoDB sessions ensure all-or-nothing transfers. No partial writes, no lost funds, no double charges.",
  },
  {
    icon: Key,
    title: "Idempotency Keys",
    desc: "Every request carries a unique key. Network retries are handled gracefully — you're never charged twice.",
  },
] as const;

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  /* ── Intersection Observer — fade cards in on scroll ───────────────── */
  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-8");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    const cards = sectionRef.current.querySelectorAll("[data-animate]");
    cards.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative px-6 py-24 md:px-12 lg:px-20"
    >
      {/* Section Header */}
      <div
        data-animate
        className="mx-auto max-w-2xl text-center mb-16 opacity-0 translate-y-8 transition-all duration-700 ease-out"
      >
        <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold mb-4">
          Why KTG-LEDGER?
        </h2>
        <p className="text-text-muted text-lg">
          Built on double-entry bookkeeping — the gold standard of financial
          integrity.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map((feat, i) => (
          <div
            key={feat.title}
            data-animate
            className="group rounded-2xl border border-border bg-surface p-8 opacity-0 translate-y-8 transition-all duration-700 ease-out hover:border-border-hover hover:shadow-lg"
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <feat.icon size={24} />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{feat.title}</h3>
            <p className="text-sm leading-relaxed text-text-muted">
              {feat.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
