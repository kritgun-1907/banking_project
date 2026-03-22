/**
 * @file FeaturesSection.tsx
 * @description "Why KTG-LEDGER?" feature cards + framed image showcase section.
 *              Uses IntersectionObserver for scroll-triggered fade-in animations.
 *              Features banking stock photos in tilted animated frames.
 */
"use client";

import React, { useEffect, useRef } from "react";
import { Shield, BookOpen, Zap, Key } from "lucide-react";

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

/** Banking showcase images — framed animated cards */
const SHOWCASE_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&q=80",
    caption: "Secure Digital Transactions",
    rotate: "-3deg",
  },
  {
    src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    caption: "Premium Banking Experience",
    rotate: "2deg",
  },
  {
    src: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
    caption: "Smart Mobile Banking",
    rotate: "-1deg",
  },
];

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
    <div ref={sectionRef}>
      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES SECTION
         ═══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative px-6 py-24 md:px-12 lg:px-20 bg-white">
        {/* Section Header */}
        <div
          data-animate
          className="mx-auto max-w-2xl text-center mb-16 opacity-0 translate-y-8 transition-all duration-700 ease-out"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4 block">
            Our Advantage
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 text-(--color-text)">
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
              className="group rounded-2xl border border-border bg-bg p-8 opacity-0 translate-y-8 transition-all duration-500 ease-out hover:border-accent hover:shadow-[0_8px_40px_rgba(212,168,83,0.12)] hover:-translate-y-1 cursor-default"
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <feat.icon size={24} />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-(--color-text)">{feat.title}</h3>
              <p className="text-sm leading-relaxed text-text-muted">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FRAMED IMAGE SHOWCASE — Tilted, animated image cards
         ═══════════════════════════════════════════════════════════════════ */}
      <section id="showcase" className="relative px-6 py-24 md:px-12 lg:px-20 bg-bg overflow-hidden">
        {/* Section Header */}
        <div
          data-animate
          className="mx-auto max-w-2xl text-center mb-16 opacity-0 translate-y-8 transition-all duration-700 ease-out"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4 block">
            Experience
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 text-(--color-text)">
            Banking, Elevated
          </h2>
          <p className="text-text-muted text-lg">
            A seamless digital experience across all your devices.
          </p>
        </div>

        {/* Framed Image Cards — carousel-style with tilt animations */}
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-6">
          {SHOWCASE_IMAGES.map((img, i) => (
            <div
              key={i}
              data-animate
              className="opacity-0 translate-y-8 transition-all duration-700 ease-out"
              style={{
                transitionDelay: `${i * 200}ms`,
                transform: `rotate(${img.rotate})`,
                animation: `tilt-card ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            >
              <div className="group relative w-80 md:w-85 rounded-2xl bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-border hover:shadow-[0_16px_60px_rgba(212,168,83,0.18)] transition-all duration-500 hover:-translate-y-2">
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={img.src}
                    alt={img.caption}
                    className="w-full h-55 object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 text-center text-sm text-text-muted font-medium pb-1">
                  {img.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
