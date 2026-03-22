/**
 * @file AuthContext.tsx
 * @description Global authentication state for the app.
 *
 * Provides:
 *  - `user`       — The currently logged-in user (null if logged out)
 *  - `setUser`    — Setter for updating user state after login/register
 *  - `handleLogout` — Calls the backend logout endpoint, clears state, navigates to landing
 *  - `isLoading`  — True while checking initial auth state
 *
 * Usage: Wrap the app in <AuthProvider>, then consume with `useAuth()`.
 */
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { User } from "@/lib/api";
import { logout as apiLogout } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Provider component — wraps the entire app tree in layout.tsx */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  /**
   * Logout: hit the backend to blacklist the JWT, then clear local state.
   * Even if the API call fails, we still clear the user state so the UI
   * resets to the landing page (the token will expire on its own).
   */
  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Token may already be expired / blacklisted — still clear locally
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access auth state from any component.
 * Throws if used outside <AuthProvider> (catches dev mistakes early).
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
