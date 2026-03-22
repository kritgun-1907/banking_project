/**
 * @file AuthForms.tsx
 * @description Register and Login forms with toggle switch between them.
 *              On success, updates the AuthContext user state (which triggers
 *              the parent page to show the Dashboard).
 *
 *              Both forms fire-and-forget to the API service layer and
 *              display inline error/success messages via the Message component.
 */
"use client";

import React, { useState, FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import Message from "@/components/ui/Message";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";

interface AuthFormsProps {
  /** Which form to show first */
  initialForm: "register" | "login";
  /** Navigate back to the landing page */
  onBack: () => void;
}

export default function AuthForms({ initialForm, onBack }: AuthFormsProps) {
  const { setUser } = useAuth();
  const [activeForm, setActiveForm] = useState<"register" | "login">(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "error" as "error" | "success" });

  /* ── Register Handler ──────────────────────────────────────────────── */
  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "error" });

    const form = e.currentTarget;
    const name = (form.elements.namedItem("reg-name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("reg-email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("reg-password") as HTMLInputElement).value;

    try {
      const res = await api.register(name, email, password);
      setUser(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  /* ── Login Handler ─────────────────────────────────────────────────── */
  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "error" });

    const form = e.currentTarget;
    const email = (form.elements.namedItem("login-email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("login-password") as HTMLInputElement).value;

    try {
      const res = await api.login(email, password);
      setUser(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 animate-fade-in-up">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl">
          <div className="mb-8 text-center">
            <Logo className="mb-6 inline-block" />
          </div>

          {/* ── Register Form ──────────────────────────────────────────── */}
          {activeForm === "register" && (
            <form onSubmit={handleRegister}>
              <h2 className="text-2xl font-bold mb-1">Create Account</h2>
              <p className="text-sm text-text-muted mb-6">
                Start your banking journey in seconds.
              </p>

              <InputField label="Full Name" id="reg-name" type="text" required />
              <InputField label="Email Address" id="reg-email" type="email" required />
              <InputField
                label="Password"
                id="reg-password"
                type="password"
                required
                minLength={6}
              />

              <Button type="submit" full disabled={loading}>
                {loading ? "Creating…" : "Register"}
              </Button>

              <p className="mt-4 text-center text-sm text-text-muted">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setActiveForm("login"); setMessage({ text: "", type: "error" }); }}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Login
                </button>
              </p>

              <Message text={message.text} type={message.type} />
            </form>
          )}

          {/* ── Login Form ─────────────────────────────────────────────── */}
          {activeForm === "login" && (
            <form onSubmit={handleLogin}>
              <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
              <p className="text-sm text-text-muted mb-6">
                Securely access your accounts.
              </p>

              <InputField label="Email Address" id="login-email" type="email" required />
              <InputField label="Password" id="login-password" type="password" required />

              <Button type="submit" full disabled={loading}>
                {loading ? "Logging in…" : "Login"}
              </Button>

              <p className="mt-4 text-center text-sm text-text-muted">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setActiveForm("register"); setMessage({ text: "", type: "error" }); }}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Register
                </button>
              </p>

              <Message text={message.text} type={message.type} />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
