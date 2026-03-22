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

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { User } from "@/lib/api";
import { logout as apiLogout, getMe, getTabToken, clearTabToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  handleLogout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Provider component — wraps the entire app tree in layout.tsx */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On mount (every tab open / page refresh): restore the session for THIS tab.
   *
   * Each tab stores its own JWT in sessionStorage under `ktg_tab_token`.
   * We send that token as an Authorization header to GET /api/auth/me.
   * Because sessionStorage is tab-isolated:
   *  - Tab A (User A) and Tab B (User B) never share tokens.
   *  - Logging in on Tab B doesn't touch Tab A's sessionStorage.
   *  - Refreshing Tab A still returns User A's session.
   *
   * If no token exists for this tab (fresh tab / after logout), we skip the
   * /me call entirely and stay on the landing page immediately.
   */
  useEffect(() => {
    if (!getTabToken()) {
      // No token for this tab — no need to hit the network, just stop loading.
      setIsLoading(false);
      return;
    }
    getMe()
      .then((res) => setUser(res.user))
      .catch(() => {
        // Token expired or blacklisted — clear it so the tab shows landing.
        clearTabToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Logout: hit the backend to blacklist THIS tab's JWT, then clear local state.
   * `apiLogout()` already calls `clearTabToken()` internally.
   * Even if the API call fails we still clear the tab token and user state
   * so the UI resets to the landing page — the token will expire on its own.
   * Other tabs are unaffected: they have their own tokens in their own
   * sessionStorage and continue running normally.
   */
  const handleLogout = useCallback(async () => {
    try {
      await apiLogout(); // clears tab token + blacklists on backend
    } catch {
      clearTabToken(); // ensure token is gone even on network error
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, handleLogout, isLoading }}>
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
