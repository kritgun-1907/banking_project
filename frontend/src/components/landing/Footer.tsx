/**
 * @file Footer.tsx
 * @description Rich landing page footer with quick links, contact info,
 *              and branding — Apple-inspired light cream theme.
 */
"use client";

import React from "react";
import { Mail, MapPin, Phone, Shield, BookOpen, Zap } from "lucide-react";
import Logo from "@/components/ui/Logo";

const QUICK_LINKS = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Showcase", href: "#showcase" },
  { label: "About Us", href: "#footer" },
];

const SERVICES = [
  { icon: Shield, label: "Secure Banking" },
  { icon: BookOpen, label: "Ledger System" },
  { icon: Zap, label: "Instant Transfers" },
];

export default function Footer() {
  return (
    <footer
      id="footer"
      className="border-t border-border bg-white"
    >
      {/* ── Main Footer Content ──────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Logo className="mb-4" />
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Modern digital banking built on double-entry bookkeeping
              principles. Secure, reliable, and professional.
            </p>
            <div className="w-10 h-0.5 bg-accent rounded-full" />
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-(--color-text) mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-text-muted hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-(--color-text) mb-5">
              Services
            </h4>
            <ul className="space-y-3">
              {SERVICES.map((svc) => (
                <li key={svc.label} className="flex items-center gap-2.5">
                  <svc.icon size={14} className="text-accent" />
                  <span className="text-sm text-text-muted">
                    {svc.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-(--color-text) mb-5">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Mail size={14} className="text-accent mt-0.5 shrink-0" />
                <span className="text-sm text-text-muted">
                  support@ktg-ledger.com
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone size={14} className="text-accent mt-0.5 shrink-0" />
                <span className="text-sm text-text-muted">
                  +91 98765 43210
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin size={14} className="text-accent mt-0.5 shrink-0" />
                <span className="text-sm text-text-muted">
                  Chandigarh, India
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ───────────────────────────────────────────────── */}
      <div className="border-t border-border bg-bg">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between px-6 py-5 md:px-12">
          <p className="text-xs text-text-dim">
            © {new Date().getFullYear()} KTG-LEDGER. Built with double-entry
            bookkeeping principles.
          </p>
          <div className="flex items-center gap-6 mt-3 md:mt-0">
            <a href="#" className="text-xs text-text-dim hover:text-accent transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-text-dim hover:text-accent transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-xs text-text-dim hover:text-accent transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
