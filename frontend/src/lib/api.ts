/**
 * @file api.ts
 * @description Centralised API service layer for the KTG-LEDGER frontend.
 *
 * Every backend endpoint has a dedicated, typed function here so that:
 *  1. Components never call `fetch()` directly — all network logic lives here.
 *  2. The base URL, headers, and credentials config are set in ONE place.
 *  3. Adding a new endpoint only requires adding a new function — no component changes.
 *
 * All functions use `credentials: "include"` to send the httpOnly JWT cookie
 * that the backend sets on login/register.
 */

/** Base URL — Next.js rewrites /api/* to localhost:3000/api/* in development */
const BASE = "/api";

/**
 * SESSION STORAGE KEY for the per-tab JWT token.
 *
 * Why sessionStorage?
 *  - sessionStorage is completely isolated per browser tab.
 *    Tab A and Tab B each have their own storage — logging in on Tab B
 *    never touches Tab A's token.
 *  - It persists across page refreshes within the same tab (unlike a React
 *    state variable), so F5 restores the session for that tab.
 *  - It is wiped automatically when the tab is closed, so there's no
 *    stale-token leakage between sessions.
 *
 * The token is sent as an Authorization: Bearer header on every request.
 * The backend middleware already accepts `cookie OR header`, so cookie-only
 * clients (like curl / Postman) still work unchanged.
 */
const TAB_TOKEN_KEY = "ktg_tab_token";

/** Save a JWT for this tab only */
export function saveTabToken(token: string) {
  sessionStorage.setItem(TAB_TOKEN_KEY, token);
}

/** Remove the tab-local JWT (called on logout) */
export function clearTabToken() {
  sessionStorage.removeItem(TAB_TOKEN_KEY);
}

/** Read the tab-local JWT (undefined if not logged in on this tab) */
export function getTabToken(): string | null {
  return sessionStorage.getItem(TAB_TOKEN_KEY);
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Shape of the user object returned by the auth endpoints */
export interface User {
  _id: string;
  name: string;
  email: string;
  systemUser?: boolean;
}

/** Shape of an account document */
export interface Account {
  _id: string;
  user: string;
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  currency: string;
}

/** Generic API response wrapper */
interface ApiResponse<T = unknown> {
  message: string;
  [key: string]: unknown;
  data?: T;
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERNAL HELPER
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Thin wrapper around `fetch` that:
 *  - Prepends BASE to the path
 *  - Sets JSON content-type for non-GET requests
 *  - Includes cookies (credentials)
 *  - Parses the JSON response
 *  - Throws on non-2xx status with the server's error message
 *
 * @param path  - Relative path (e.g. "/auth/login")
 * @param opts  - Standard RequestInit overrides
 * @returns Parsed JSON body
 */
async function request<T = ApiResponse>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };

  // Attach the tab-local JWT as a Bearer token so each browser tab can
  // maintain its own independent session.  The backend middleware reads
  // cookie OR Authorization header — the header takes precedence here.
  const tabToken = getTabToken();
  if (tabToken) {
    headers["Authorization"] = `Bearer ${tabToken}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include", // send httpOnly JWT cookie
  });

  // Safely parse the body — a non-JSON response (e.g. a Next.js HTML 404 page)
  // means the backend route doesn't exist or the dev proxy isn't running.
  const contentType = res.headers.get("content-type") ?? "";
  let body: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    // Consume the body so the connection can close, then surface a clear message.
    const text = await res.text();
    const err = new Error(
      res.ok
        ? "Server returned an unexpected non-JSON response."
        : `Server error ${res.status}: received non-JSON response. Is the backend running?`
    ) as Error & { status: number };
    err.status = res.status;
    // Attach raw text in development to help debugging.
    if (process.env.NODE_ENV !== "production") {
      console.error(`[api] Non-JSON response for ${path}:`, text.slice(0, 300));
    }
    throw err;
  }

  if (!res.ok) {
    const err = new Error(body.message as string || "Something went wrong") as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }

  return body as T;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTH ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Register a new user.
 * POST /api/auth/register
 */
export async function register(name: string, email: string, password: string) {
  const res = await request<{ message: string; user: User; token: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }
  );
  // Store the token in this tab's sessionStorage so this tab keeps its own session.
  saveTabToken(res.token);
  return res;
}

/**
 * Login an existing user.
 * POST /api/auth/login
 */
export async function login(email: string, password: string) {
  const res = await request<{ message: string; user: User; token: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  // Store the token in this tab's sessionStorage so this tab keeps its own session.
  saveTabToken(res.token);
  return res;
}

/**
 * Logout the current user (blacklists the JWT).
 * POST /api/auth/logout
 */
export async function logout() {
  const res = await request<{ message: string }>("/auth/logout", { method: "POST" });
  // Remove only this tab's token — other tabs keep their own sessions.
  clearTabToken();
  return res;
}

/**
 * Get the currently logged-in user from the JWT cookie.
 * GET /api/auth/me
 * Used on every tab load to rehydrate session state.
 */
export async function getMe() {
  return request<{ user: User }>("/auth/me");
}

/**
 * Request a password-reset OTP email.
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * Validate OTP and receive a short-lived resetToken.
 * POST /api/auth/verify-otp
 */
export async function verifyOtp(email: string, otp: string) {
  return request<{ message: string; resetToken: string }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

/**
 * Set a new password using the resetToken from verifyOtp.
 * POST /api/auth/reset-password
 */
export async function resetPassword(resetToken: string, newPassword: string) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword }),
  });
}

/**
 * Change password while logged in.
 * POST /api/auth/change-password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  return request<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACCOUNT ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a new bank account for the authenticated user.
 * POST /api/account
 */
export async function createAccount() {
  return request<{ message: string; account: Account }>("/account", {
    method: "POST",
  });
}

/**
 * Fetch all accounts belonging to the authenticated user.
 * GET /api/account
 */
export async function getAccounts() {
  return request<{ message: string; accounts: Account[] }>("/account");
}

/**
 * Get the current balance for a specific account.
 * GET /api/account/balance/:accountId
 */
export async function getBalance(accountId: string) {
  return request<{ message: string; accountId: string; balance: number }>(
    `/account/balance/${accountId}`
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSACTION ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a new fund transfer between two accounts.
 * POST /api/transactions
 *
 * @param fromAccount     - Source account _id
 * @param toAccount       - Destination account _id
 * @param amount          - Transfer amount (> 0)
 * @param idempotencyKey  - Client-generated UUID to prevent double-charges
 */
export async function createTransaction(
  fromAccount: string,
  toAccount: string,
  amount: number,
  idempotencyKey: string
) {
  return request<{
    message: string;
    transactionId: string;
    status: string;
  }>("/transactions", {
    method: "POST",
    body: JSON.stringify({ fromAccount, toAccount, amount, idempotencyKey }),
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN ENDPOINTS  (system user only)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface AdminAccount {
  _id: string;
  status: string;
  currency: string;
  balance: number;
  createdAt: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  accounts: AdminAccount[];
}

export interface AdminStats {
  totalUsers: number;
  activeAccounts: number;
  totalTransactions: number;
  totalVolume: number;
  systemBalance: number;
}

/** GET /api/admin/users — all users with accounts and live balances */
export async function adminGetUsers() {
  return request<{ message: string; users: AdminUser[] }>("/admin/users");
}

/** GET /api/admin/stats — platform-wide statistics */
export async function adminGetStats() {
  return request<{ message: string; stats: AdminStats }>("/admin/stats");
}

/** POST /api/admin/initial-funds — issue funds from system account */
export async function adminIssueFunds(
  toAccount: string,
  amount: number,
  idempotencyKey: string
) {
  return request<{ message: string; transactionId: string; status: string }>(
    "/admin/initial-funds",
    {
      method: "POST",
      body: JSON.stringify({ toAccount, amount, idempotencyKey }),
    }
  );
}