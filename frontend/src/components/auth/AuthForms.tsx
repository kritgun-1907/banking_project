/**
 * @file AuthForms.tsx
 * @description Register / Login / Forgot-password (3-step OTP flow) forms.
 */
"use client";

import React, { useState, FormEvent, useRef } from "react";
import { ArrowLeft, Mail, KeyRound, ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import Message from "@/components/ui/Message";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";

interface AuthFormsProps {
  initialForm: "register" | "login";
  onBack: () => void;
}

type ActiveForm = "register" | "login" | "forgot" | "otp" | "reset";

export default function AuthForms({ initialForm, onBack }: AuthFormsProps) {
  const { setUser } = useAuth();
  const [activeForm, setActiveForm] = useState<ActiveForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "error" as "error" | "success" });

  const [fpEmail, setFpEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  const otp0 = useRef<HTMLInputElement>(null);
  const otp1 = useRef<HTMLInputElement>(null);
  const otp2 = useRef<HTMLInputElement>(null);
  const otp3 = useRef<HTMLInputElement>(null);
  const otp4 = useRef<HTMLInputElement>(null);
  const otp5 = useRef<HTMLInputElement>(null);
  const otpRefs = [otp0, otp1, otp2, otp3, otp4, otp5];
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);

  function clearMsg() { setMessage({ text: "", type: "error" }); }
  function goTo(form: ActiveForm) { clearMsg(); setActiveForm(form); }
  function errMsg(err: unknown) { return err instanceof Error ? err.message : "Something went wrong"; }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); clearMsg();
    const form = e.currentTarget;
    const name     = (form.elements.namedItem("reg-name")     as HTMLInputElement).value;
    const email    = (form.elements.namedItem("reg-email")    as HTMLInputElement).value;
    const password = (form.elements.namedItem("reg-password") as HTMLInputElement).value;
    try {
      const res = await api.register(name, email, password);
      setUser(res.user);
    } catch (err) { setMessage({ text: errMsg(err), type: "error" }); }
    finally { setLoading(false); }
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); clearMsg();
    const form = e.currentTarget;
    const email    = (form.elements.namedItem("login-email")    as HTMLInputElement).value;
    const password = (form.elements.namedItem("login-password") as HTMLInputElement).value;
    try {
      const res = await api.login(email, password);
      setUser(res.user);
    } catch (err) { setMessage({ text: errMsg(err), type: "error" }); }
    finally { setLoading(false); }
  }

  async function handleForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); clearMsg();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("fp-email") as HTMLInputElement).value;
    try {
      await api.forgotPassword(email);
      setFpEmail(email);
      setMessage({ text: "OTP sent! Check your inbox.", type: "success" });
      setTimeout(() => { clearMsg(); goTo("otp"); }, 1200);
    } catch (err) { setMessage({ text: errMsg(err), type: "error" }); }
    finally { setLoading(false); }
  }

  async function handleOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length < 6) { setMessage({ text: "Enter all 6 digits", type: "error" }); return; }
    setLoading(true); clearMsg();
    try {
      const res = await api.verifyOtp(fpEmail, otp);
      setResetToken(res.resetToken);
      goTo("reset");
    } catch (err) { setMessage({ text: errMsg(err), type: "error" }); }
    finally { setLoading(false); }
  }

  function handleOtpDigit(index: number, val: string) {
    const digit = val.replace(/\D/, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs[index + 1].current?.focus();
    if (!digit && index > 0) otpRefs[index - 1].current?.focus();
  }

  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); clearMsg();
    const form = e.currentTarget;
    const newPassword  = (form.elements.namedItem("new-password")    as HTMLInputElement).value;
    const confirmPass  = (form.elements.namedItem("confirm-password") as HTMLInputElement).value;
    if (newPassword !== confirmPass) {
      setMessage({ text: "Passwords do not match", type: "error" });
      setLoading(false); return;
    }
    try {
      await api.resetPassword(resetToken, newPassword);
      setMessage({ text: "Password reset! Please log in.", type: "success" });
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => goTo("login"), 1500);
    } catch (err) { setMessage({ text: errMsg(err), type: "error" }); }
    finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-screen animate-fade-in">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80"
          alt="Banking"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(250,248,245,0.3), rgba(250,248,245,0.6))" }}
        />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <Logo large className="mb-4 text-white drop-shadow-lg" />
          <p className="text-white/80 text-lg max-w-sm leading-relaxed drop-shadow">
            Secure ledger-based banking with double-entry bookkeeping — trusted by professionals.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12" style={{ background: "var(--color-bg)" }}>
        <div className="w-full max-w-md animate-fade-in-up">
          <button
            onClick={activeForm === "forgot" || activeForm === "otp" || activeForm === "reset"
              ? () => goTo("login")
              : onBack}
            className="mb-6 flex items-center gap-2 text-sm transition-colors cursor-pointer group"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            {activeForm === "forgot" || activeForm === "otp" || activeForm === "reset"
              ? "Back to Login"
              : "Back"}
          </button>

          <div className="rounded-2xl border bg-white p-8"
            style={{ borderColor: "var(--color-border)", boxShadow: "0 4px 40px rgba(0,0,0,0.06)" }}>
            <div className="mb-8 text-center">
              <Logo className="mb-2 inline-block" />
              <div className="w-12 h-0.5 rounded-full mx-auto mt-3" style={{ background: "var(--color-accent)" }} />
            </div>

            {activeForm === "register" && (
              <form onSubmit={handleRegister}>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text)" }}>Create Account</h2>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>Start your banking journey in seconds.</p>
                <InputField label="Full Name"     id="reg-name"     type="text"     required />
                <InputField label="Email Address" id="reg-email"    type="email"    required />
                <InputField label="Password"      id="reg-password" type="password" required minLength={6} />
                <Button type="submit" full disabled={loading}>{loading ? "Creating…" : "Register"}</Button>
                <p className="mt-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Already have an account?{" "}
                  <button type="button" onClick={() => goTo("login")}
                    className="font-semibold hover:underline cursor-pointer"
                    style={{ color: "var(--color-accent)" }}>Login</button>
                </p>
                <Message text={message.text} type={message.type} />
              </form>
            )}

            {activeForm === "login" && (
              <form onSubmit={handleLogin}>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text)" }}>Welcome Back</h2>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>Securely access your accounts.</p>
                <InputField label="Email Address" id="login-email"    type="email"    required />
                <InputField label="Password"      id="login-password" type="password" required />
                <div className="flex justify-end -mt-2 mb-4">
                  <button type="button" onClick={() => goTo("forgot")}
                    className="text-xs hover:underline cursor-pointer"
                    style={{ color: "var(--color-accent)" }}>Forgot password?</button>
                </div>
                <Button type="submit" full disabled={loading}>{loading ? "Logging in…" : "Login"}</Button>
                <p className="mt-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => goTo("register")}
                    className="font-semibold hover:underline cursor-pointer"
                    style={{ color: "var(--color-accent)" }}>Register</button>
                </p>
                <Message text={message.text} type={message.type} />
              </form>
            )}

            {activeForm === "forgot" && (
              <form onSubmit={handleForgot}>
                <div className="flex justify-center mb-4">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(212,168,83,0.1)" }}>
                    <Mail size={22} style={{ color: "var(--color-accent)" }} />
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--color-text)" }}>Reset Password</h2>
                <p className="text-sm mb-6 text-center" style={{ color: "var(--color-text-muted)" }}>
                  Enter your email and we&apos;ll send a 6-digit OTP.
                </p>
                <InputField label="Email Address" id="fp-email" type="email" required defaultValue={fpEmail} />
                <Button type="submit" full disabled={loading}>{loading ? "Sending OTP…" : "Send OTP"}</Button>
                <Message text={message.text} type={message.type} />
              </form>
            )}

            {activeForm === "otp" && (
              <form onSubmit={handleOtp}>
                <div className="flex justify-center mb-4">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(212,168,83,0.1)" }}>
                    <KeyRound size={22} style={{ color: "var(--color-accent)" }} />
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--color-text)" }}>Enter OTP</h2>
                <p className="text-sm mb-6 text-center" style={{ color: "var(--color-text-muted)" }}>
                  We sent a 6-digit code to <strong>{fpEmail}</strong>. Expires in 10 minutes.
                </p>
                <div className="flex justify-center gap-3 mb-6">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digit && i > 0) otpRefs[i - 1].current?.focus();
                      }}
                      className="w-11 h-14 rounded-xl border text-center text-xl font-bold outline-none transition-all"
                      style={{
                        borderColor: digit ? "var(--color-accent)" : "var(--color-border)",
                        background: digit ? "rgba(212,168,83,0.06)" : "white",
                        boxShadow: digit ? "0 0 0 2px rgba(212,168,83,0.25)" : undefined,
                        color: "var(--color-text)",
                      }}
                    />
                  ))}
                </div>
                <Button type="submit" full disabled={loading}>{loading ? "Verifying…" : "Verify OTP"}</Button>
                <p className="mt-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Didn&apos;t receive it?{" "}
                  <button type="button" onClick={() => goTo("forgot")}
                    className="hover:underline cursor-pointer"
                    style={{ color: "var(--color-accent)" }}>Resend</button>
                </p>
                <Message text={message.text} type={message.type} />
              </form>
            )}

            {activeForm === "reset" && (
              <form onSubmit={handleReset}>
                <div className="flex justify-center mb-4">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(212,168,83,0.1)" }}>
                    <ShieldCheck size={22} style={{ color: "var(--color-accent)" }} />
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--color-text)" }}>New Password</h2>
                <p className="text-sm mb-6 text-center" style={{ color: "var(--color-text-muted)" }}>
                  Choose a strong password you haven&apos;t used before.
                </p>
                <InputField label="New Password"     id="new-password"     type="password" required minLength={6} />
                <InputField label="Confirm Password" id="confirm-password" type="password" required minLength={6} />
                <Button type="submit" full disabled={loading}>{loading ? "Saving…" : "Reset Password"}</Button>
                <Message text={message.text} type={message.type} />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
