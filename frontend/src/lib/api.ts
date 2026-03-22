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

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Shape of the user object returned by the auth endpoints */
export interface User {
  _id: string;
  name: string;
  email: string;
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

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include", // send httpOnly JWT cookie
  });

  const body = await res.json();

  if (!res.ok) {
    const err = new Error(body.message || "Something went wrong") as Error & {
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
  return request<{ message: string; user: User; token: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }
  );
}

/**
 * Login an existing user.
 * POST /api/auth/login
 */
export async function login(email: string, password: string) {
  return request<{ message: string; user: User; token: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
}

/**
 * Logout the current user (blacklists the JWT).
 * POST /api/auth/logout
 */
export async function logout() {
  return request<{ message: string }>("/auth/logout", { method: "POST" });
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
