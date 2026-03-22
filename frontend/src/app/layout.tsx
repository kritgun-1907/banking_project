/**
 * @file layout.tsx
 * @description Root layout for the Next.js app. Wraps every page with:
 *   - Google Fonts (Inter + Playfair Display) loaded via next/font
 *   - Global CSS import (Tailwind v4 + custom tokens)
 *   - AuthProvider context (manages JWT token + user state)
 *   - HTML lang attribute for accessibility
 */
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

/** Inter — primary UI font (variable, weight 300-800) */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** Playfair Display — display/hero font (weight 600-700) */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KTG-LEDGER — Modern Banking",
  description:
    "Secure ledger-based banking with double-entry bookkeeping, atomic transactions, and enterprise-grade security.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
