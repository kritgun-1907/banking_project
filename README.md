# 🏦 KTG-LEDGER — Double-Entry Bookkeeping Banking Application

A full-stack banking application built with **Node.js / Express 5** and **Next.js 16 / React 19**, featuring a **double-entry bookkeeping ledger system**, JWT authentication with per-tab session isolation, account lockout, OTP-based password reset, a super-admin dashboard, and real-time Gmail OAuth2 email notifications.

> **Double-entry bookkeeping** means every financial transaction creates exactly two ledger entries — a DEBIT on the sender's account and a CREDIT on the receiver's account — ensuring the system always balances to zero.

---

## 📑 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Authentication & Security](#-authentication--security)
- [Email Service](#-email-service)
- [Frontend](#-frontend)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | — | Runtime |
| **Express** | 5.2.1 | Web framework |
| **Mongoose** | 9.2.4 | MongoDB ODM |
| **MongoDB Atlas** | — | Database |
| **bcryptjs** | 3.0.3 | Password hashing |
| **jsonwebtoken** | 9.0.3 | JWT auth |
| **nodemailer** | 8.0.3 | Gmail OAuth2 emails |
| **cookie-parser** | 1.4.7 | Cookie parsing |
| **cors** | 2.8.6 | Cross-origin requests |
| **dotenv** | 17.3.1 | Environment variables |
| **nodemon** | 3.1.14 | Dev hot-reload |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.1 | React framework (with API proxy rewrites) |
| **React** | 19.2.4 | UI library |
| **TypeScript** | 5.9.3 | Type safety |
| **Tailwind CSS** | 4.2.2 | Utility-first CSS (v4 `@theme` syntax) |
| **Lucide React** | 0.577.0 | Icon library |

---

## 🏗 Architecture Overview

```
┌──────────────────────┐         ┌──────────────────────────┐
│   Next.js Frontend   │  proxy  │   Express 5 Backend      │
│   (port 5500)        │ ──────► │   (port 3000)            │
│                      │ /api/*  │                          │
│  • React 19 SPA      │         │  • REST API              │
│  • Tailwind v4       │         │  • JWT + Cookie Auth     │
│  • Per-tab sessions  │         │  • MongoDB (Mongoose)    │
│  • AuthContext        │         │  • Double-entry Ledger   │
└──────────────────────┘         │  • Gmail OAuth2 Emails   │
                                 └──────────┬───────────────┘
                                            │
                                 ┌──────────▼───────────────┐
                                 │   MongoDB Atlas           │
                                 │                          │
                                 │  Collections:            │
                                 │  • users                 │
                                 │  • accounts              │
                                 │  • transactions          │
                                 │  • ledgers (immutable)   │
                                 │  • blacklists (TTL: 3d)  │
                                 │  • otps (TTL: 10m)       │
                                 └──────────────────────────┘
```

### Double-Entry Bookkeeping Flow

```
User A transfers ₹5,000 to User B:

1. Transaction document created (status: PENDING)
2. DEBIT  ledger entry → Account A, ₹5,000, type: DEBIT
3. CREDIT ledger entry → Account B, ₹5,000, type: CREDIT
4. Transaction status → COMPLETED
5. All 4 writes committed atomically (MongoDB session)

Balance = SUM(CREDIT amounts) − SUM(DEBIT amounts)
```

- Ledger entries are **immutable** — all update/delete operations throw errors.
- Balance is **never stored** — it is always **computed** from ledger entries via MongoDB aggregation.
- Transactions use **MongoDB sessions** for atomic all-or-nothing commits.
- **Idempotency keys** prevent double-charges on network retries.

---

## 📁 Project Structure

```
banking_project/
│
├── backend/
│   ├── server.js                           # Entry point — connects to DB, starts Express on port 3000
│   ├── package.json                        # Backend dependencies (ktg-ledger-backend)
│   ├── .env                                # Environment variables (not committed)
│   ├── .env.example                        # Template for required env vars
│   ├── test_endpoints.sh                   # cURL-based API test script (22 tests)
│   │
│   └── src/
│       ├── app.js                          # Express config: middleware + 4 route mounts
│       │
│       ├── config/
│       │   └── db.js                       # MongoDB Atlas connection via mongoose.connect()
│       │
│       ├── middleware/
│       │   └── auth.middleware.js           # authMiddleware (JWT) + adminMiddleware (systemUser)
│       │
│       ├── models/
│       │   ├── user.model.js               # User schema (email, name, password, lockout fields, systemUser)
│       │   ├── account.model.js            # Account schema + getCurrentBalance() aggregation
│       │   ├── transaction.model.js        # Transaction schema (idempotencyKey, status enum)
│       │   ├── ledger.model.js             # Ledger schema — IMMUTABLE (all mutations blocked)
│       │   ├── blacklist.model.js          # JWT blacklist with 3-day TTL auto-delete
│       │   └── otp.model.js               # OTP schema with 10-minute TTL auto-delete
│       │
│       ├── controllers/
│       │   ├── auth.controller.js          # 8 controllers (me, register, login, logout, forgot, verifyOtp, reset, change)
│       │   ├── account.controller.js       # 3 controllers (create, list, getBalance)
│       │   ├── transaction.controller.js   # 2 controllers + shared _executeTransfer() helper
│       │   └── admin.controller.js         # 3 controllers (getAllUsers, getStats, issueFunds)
│       │
│       ├── routes/
│       │   ├── auth.routes.js              # 8 auth routes (6 public + 2 protected)
│       │   ├── account.routes.js           # 3 account routes (all protected)
│       │   ├── transaction.routes.js       # 2 transaction routes (1 user + 1 admin)
│       │   └── admin.routes.js             # 3 admin routes (all behind adminMiddleware)
│       │
│       └── services/
│           └── email.service.js            # 7 email templates via Gmail OAuth2
│
├── frontend/
│   ├── next.config.ts                      # API proxy: /api/* → localhost:3000/api/*
│   ├── package.json                        # Frontend dependencies (ktg-ledger-frontend)
│   ├── postcss.config.mjs                  # PostCSS + Tailwind v4
│   ├── tsconfig.json                       # TypeScript config
│   │
│   └── src/
│       ├── app/
│       │   ├── globals.css                 # Tailwind v4 @theme with custom design tokens
│       │   ├── layout.tsx                  # Root layout — wraps app in AuthProvider
│       │   └── page.tsx                    # SPA router: landing / auth / dashboard / admin
│       │
│       ├── context/
│       │   └── AuthContext.tsx              # Auth state management, per-tab token check on mount
│       │
│       ├── lib/
│       │   ├── api.ts                      # All API functions + sessionStorage tab token isolation
│       │   └── helpers.ts                  # Utility functions (idempotency key, greeting, currency format)
│       │
│       └── components/
│           ├── auth/
│           │   └── AuthForms.tsx           # 5-state form (register / login / forgot / otp / reset)
│           ├── dashboard/
│           │   ├── DashboardView.tsx       # User dashboard layout
│           │   ├── AccountCard.tsx         # Account card with copy-to-clipboard for ID
│           │   ├── TransferForm.tsx         # Fund transfer form
│           │   └── AdminDashboard.tsx      # Super-admin dashboard (stats, users, issue funds)
│           ├── landing/
│           │   ├── HeroSection.tsx         # Landing page hero
│           │   ├── FeaturesSection.tsx     # Feature showcase cards
│           │   └── Footer.tsx              # Site footer
│           └── ui/
│               ├── Button.tsx              # Reusable button component
│               ├── InputField.tsx          # Styled input with floating label
│               ├── Logo.tsx                # KTG-LEDGER logo
│               ├── Message.tsx             # Alert/notification component
│               └── Modal.tsx               # Modal dialog component
│
└── learnings.js                            # Developer notes/learnings file
```

---

## 🗄 Database Schema

### User (`users`)

| Field | Type | Details |
|---|---|---|
| `email` | String | Unique, regex validated, required |
| `name` | String | Required, trimmed |
| `password` | String | Bcrypt hashed (select: false), min 6 chars |
| `systemUser` | Boolean | Default: false, immutable (select: false) |
| `failedLoginAttempts` | Number | Default: 0 (select: false) |
| `lockUntil` | Date | Account lockout expiry (select: false) |

- **Pre-save hook** automatically hashes password with bcrypt (salt rounds: 10).
- **Instance method** `comparePassword(candidatePassword)` for login verification.

### Account (`accounts`)

| Field | Type | Details |
|---|---|---|
| `user` | ObjectId | Ref: `user`, required |
| `status` | String | Enum: `ACTIVE`, `FROZEN`, `CLOSED` (default: `ACTIVE`) |
| `currency` | String | Default: `INR` |

- **Compound index**: `{ user: 1, status: 1 }`
- **Instance method** `getCurrentBalance()` — MongoDB aggregation pipeline:
  ```
  Balance = SUM(CREDIT ledger entries) − SUM(DEBIT ledger entries)
  ```

### Transaction (`transactions`)

| Field | Type | Details |
|---|---|---|
| `fromAccount` | ObjectId | Ref: `account`, required |
| `toAccount` | ObjectId | Ref: `account`, required |
| `amount` | Number | Min: 0, required |
| `status` | String | Enum: `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| `idempotencyKey` | String | Unique, required |

- **Compound index**: `{ fromAccount: 1, toAccount: 1, status: 1 }`
- **Idempotency**: Unique index on `idempotencyKey` prevents duplicate transactions at the database level, handling race conditions via optimistic concurrency.

### Ledger (`ledgers`) — ⚠️ IMMUTABLE

| Field | Type | Details |
|---|---|---|
| `account` | ObjectId | Ref: `account`, immutable |
| `amount` | Number | Immutable |
| `transaction` | ObjectId | Ref: `transaction`, immutable |
| `type` | String | Enum: `DEBIT`, `CREDIT`, immutable |

- **All fields are immutable** — set once, never changed.
- **All update/delete hooks throw errors** (`updateOne`, `updateMany`, `findOneAndUpdate`, `findOneAndDelete`, `deleteOne`, `deleteMany`) — ledger entries form an **append-only audit trail**.

### Token Blacklist (`blacklists`)

| Field | Type | Details |
|---|---|---|
| `token` | String | Unique, required |
| `blacklistedAt` | Date | Default: now, immutable |

- **TTL index**: Auto-deletes documents after **3 days** (matches JWT `EXPIRES_IN`).

### OTP (`otps`)

| Field | Type | Details |
|---|---|---|
| `email` | String | Required |
| `otp` | String | Required |
| `createdAt` | Date | Default: now |

- **TTL index**: Auto-deletes after **10 minutes**.
- **Compound index** on `email` for efficient upsert operations.

---

## 🔌 API Endpoints

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register a new user, set JWT cookie, send welcome email |
| `POST` | `/login` | Public | Login with email/password, account lockout after 5 failures |
| `POST` | `/logout` | Public | Blacklist current JWT, clear cookie |
| `POST` | `/forgot-password` | Public | Send 6-digit OTP to email (10-min TTL) |
| `POST` | `/verify-otp` | Public | Validate OTP, receive a short-lived reset token (15-min) |
| `POST` | `/reset-password` | Public | Exchange reset token for new password |
| `GET` | `/me` | 🔒 Auth | Return current user (supports multi-tab session restore) |
| `POST` | `/change-password` | 🔒 Auth | Change password (requires current password), blacklists token |

#### Request/Response Details

<details>
<summary><strong>POST /api/auth/register</strong></summary>

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": { "_id": "...", "name": "John Doe", "email": "john@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```
</details>

<details>
<summary><strong>POST /api/auth/login</strong></summary>

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "User logged in successfully",
  "user": { "_id": "...", "name": "John Doe", "email": "john@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Account Locked (423):**
```json
{
  "message": "Account locked for 30 minutes due to too many failed attempts."
}
```
</details>

<details>
<summary><strong>POST /api/auth/forgot-password</strong></summary>

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response (200):**
```json
{ "message": "If that email is registered, an OTP has been sent." }
```
> Always returns 200 — does not reveal if the email exists (security best practice).
</details>

<details>
<summary><strong>POST /api/auth/verify-otp</strong></summary>

**Request Body:**
```json
{ "email": "john@example.com", "otp": "847291" }
```

**Response (200):**
```json
{ "message": "OTP verified", "resetToken": "eyJhbGciOiJIUzI1NiIs..." }
```
</details>

<details>
<summary><strong>POST /api/auth/reset-password</strong></summary>

**Request Body:**
```json
{ "resetToken": "eyJhbGciOiJIUzI1NiIs...", "newPassword": "newSecurePassword" }
```

**Response (200):**
```json
{ "message": "Password reset successfully. Please log in." }
```
</details>

<details>
<summary><strong>POST /api/auth/change-password</strong></summary>

**Request Body:**
```json
{ "currentPassword": "oldPassword", "newPassword": "newSecurePassword" }
```

**Response (200):**
```json
{ "message": "Password changed successfully. Please log in again." }
```
> Blacklists the current token and clears the cookie — user must re-login.
</details>

---

### Account Routes — `/api/account`

All routes require authentication (`authMiddleware`).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Create a new ACTIVE account (INR) |
| `GET` | `/` | Get all accounts for the authenticated user |
| `GET` | `/balance/:accountId` | Get live balance for a specific account |

<details>
<summary><strong>POST /api/account</strong></summary>

**Response (201):**
```json
{
  "message": "Account created successfully",
  "account": { "_id": "...", "user": "...", "status": "ACTIVE", "currency": "INR" }
}
```
</details>

<details>
<summary><strong>GET /api/account/balance/:accountId</strong></summary>

**Response (200):**
```json
{
  "message": "Account balance retrieved successfully",
  "accountId": "...",
  "balance": 50000
}
```
> Balance is computed in real-time from ledger entries — never cached or stored.
</details>

---

### Transaction Routes — `/api/transactions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | 🔒 Auth | Create a user-to-user fund transfer |
| `POST` | `/system/initial-funds` | 🔒 Admin | Issue initial funds from system account (admin only) |

<details>
<summary><strong>POST /api/transactions</strong></summary>

**Request Body:**
```json
{
  "fromAccount": "665a1b2c3d4e5f6a7b8c9d0e",
  "toAccount": "665a1b2c3d4e5f6a7b8c9d0f",
  "amount": 5000,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "message": "Transaction completed successfully",
  "transactionId": "...",
  "status": "COMPLETED"
}
```

**10-Step Process:**
1. Validate request body
2. Check idempotency key (prevent duplicates)
3. Verify both accounts exist and are ACTIVE
4. Check sender has sufficient balance
5. Start MongoDB session
6. Create PENDING transaction document
7. Create DEBIT ledger entry (sender) + CREDIT ledger entry (receiver)
8. Mark transaction as COMPLETED
9. Commit session atomically
10. Send email notifications (fire-and-forget)

**Idempotency Responses:**
- `200` — Already completed (returns cached result)
- `202` — Currently processing (retry later)
- `409` — Refunded / race condition conflict
- `400` — Previous attempt failed (use new key)
</details>

---

### Admin Routes — `/api/admin`

All routes require `adminMiddleware` (must be a `systemUser`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | All regular users with their accounts + live balances |
| `GET` | `/stats` | Platform-wide statistics (users, accounts, volume, system balance) |
| `POST` | `/initial-funds` | Issue funds from system account to any user account |

<details>
<summary><strong>GET /api/admin/stats</strong></summary>

**Response (200):**
```json
{
  "message": "Stats retrieved successfully",
  "stats": {
    "totalUsers": 42,
    "activeAccounts": 56,
    "totalTransactions": 180,
    "totalVolume": 9500000,
    "systemBalance": -950000
  }
}
```
</details>

<details>
<summary><strong>POST /api/admin/initial-funds</strong></summary>

**Request Body:**
```json
{
  "toAccount": "665a1b2c3d4e5f6a7b8c9d0e",
  "amount": 100000,
  "idempotencyKey": "admin-seed-001"
}
```

**Response (201):**
```json
{
  "message": "Initial funds issued successfully",
  "transactionId": "...",
  "status": "COMPLETED",
  "amount": 100000,
  "toAccount": "665a1b2c3d4e5f6a7b8c9d0e"
}
```
</details>

---

## 🔐 Authentication & Security

### JWT Authentication
- **Dual delivery**: JWT is sent as an `httpOnly` cookie (`jwt_token`) AND returned in the response body as `token`.
- **Per-tab isolation**: Each browser tab stores the JWT in `sessionStorage` (`ktg_tab_token` key) and sends it as `Authorization: Bearer <token>` header. This allows independent login sessions per tab.
- **Cookie attributes**: `httpOnly: true`, `sameSite: strict` (CSRF protection).

### Token Blacklisting
- On logout or password change, the current JWT is added to the `blacklists` collection.
- Every authenticated request checks the blacklist before processing.
- Blacklisted tokens auto-delete after 3 days via MongoDB TTL index.

### Account Lockout
- **5 failed login attempts** → account locked for **30 minutes**.
- Lock counter resets on successful login.
- Lockout notification email sent to the user.
- Locked accounts return HTTP `423 Locked`.

### Password Reset (3-Step OTP Flow)
1. **Forgot Password** → Server sends a 6-digit OTP to the user's email (10-min TTL).
2. **Verify OTP** → Server validates OTP and returns a short-lived reset token (15-min JWT).
3. **Reset Password** → Server exchanges reset token for a new password.

### Middleware

| Middleware | Purpose |
|---|---|
| `authMiddleware` | Verifies JWT (cookie or Bearer header), checks blacklist, attaches `req.user` |
| `adminMiddleware` | Same as authMiddleware + verifies `user.systemUser === true`, returns 403 if not |

### Immutable Ledger
- Ledger entries **cannot be modified or deleted** — all mutation hooks throw errors.
- This creates a tamper-proof, append-only audit trail for all financial transactions.

---

## 📧 Email Service

Built with **Nodemailer** using **Gmail OAuth2** authentication. All emails are sent asynchronously (fire-and-forget) — they never block API responses.

| Email | Trigger | Description |
|---|---|---|
| **Welcome** | User registration | Welcome message with login instructions |
| **Login Alert** | Successful login | IP address, device, timestamp |
| **Password Changed** | Password reset or change | Security notification |
| **Password Reset OTP** | Forgot password request | 6-digit OTP with expiry timer |
| **Account Locked** | 5th failed login attempt | Lock duration + reset password suggestion |
| **Transaction Alert** | Fund transfer (debit/credit) | Amount, balance, description |
| **Low Balance Alert** | Balance below threshold | Current balance warning |

All emails feature styled HTML templates with the **KTG-LEDGER** branding.

---

## 🖥 Frontend

### Page Routing (SPA)

The frontend is a single-page application (`page.tsx`) that renders different views based on auth state:

| State | View | Description |
|---|---|---|
| Not authenticated | **Landing Page** | Hero, features section, footer |
| Auth form active | **Auth Forms** | 5-state form (register/login/forgot/otp/reset) |
| Authenticated (regular user) | **Dashboard** | Account cards, transfer form, balance display |
| Authenticated (systemUser) | **Admin Dashboard** | Stats cards, user table, issue funds modal |

### Per-Tab Session Isolation

Each browser tab maintains an independent session:
- On login/register: JWT is saved to `sessionStorage` (`ktg_tab_token`).
- `AuthContext` checks `sessionStorage` on mount — if no token, skips `/api/auth/me` call.
- Each API request attaches the tab-specific token via `Authorization: Bearer` header.
- Logging out in one tab does not affect other tabs.

### Design System

- **Tailwind CSS v4** with `@theme` directive defining custom design tokens in `globals.css`.
- Cream/Apple-inspired theme with custom color variables.
- Responsive layouts with modern card-based UI.
- **Lucide React** icons throughout.

### Key Frontend Components

| Component | Purpose |
|---|---|
| `AuthContext.tsx` | Global auth state, session restore, login/logout handlers |
| `api.ts` | All API calls, request helper with Content-Type-safe JSON parsing, tab token management |
| `helpers.ts` | `generateIdempotencyKey()`, `getGreeting()`, `formatCurrency()`, `truncateId()` |
| `AuthForms.tsx` | 5-state form: register → login → forgot → OTP entry → reset |
| `DashboardView.tsx` | Main user dashboard layout |
| `AccountCard.tsx` | Account display with copy-to-clipboard for full MongoDB ObjectId |
| `TransferForm.tsx` | Fund transfer with idempotency key generation |
| `AdminDashboard.tsx` | Stats overview, user list with balances, issue funds modal |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **MongoDB Atlas** account (or local MongoDB with replica set for transactions)
- **Google Cloud Console** project with Gmail API enabled (for OAuth2 emails)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd banking_project
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (see [Environment Variables](#-environment-variables)):

```bash
cp .env.example .env
# Edit .env with your actual values
```

Start the backend:

```bash
npm run dev    # Development with nodemon (hot-reload)
# or
npm start      # Production
```

The backend will start on **http://localhost:3000**.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:5500**.

### 4. Create a System User (Admin)

The system user must be created directly in MongoDB (the `systemUser` field is immutable and cannot be set via the API):

```javascript
// In MongoDB Shell or Atlas UI:
db.users.insertOne({
  name: "System Admin",
  email: "admin@ktg-ledger.com",
  password: "<bcrypt-hashed-password>",
  systemUser: true
});
```

Then create an ACTIVE account for the system user — this account acts as the bank's reserve for issuing initial funds.

---

## 🔧 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# JWT
JWT_SECRET=your_super_secret_key_here
EXPIRES_IN=3d

# Gmail OAuth2 (for email service)
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REFRESH_TOKEN=your_google_refresh_token
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_email_password
```

### Gmail OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Gmail API**.
3. Create **OAuth 2.0 credentials** (Web Application).
4. Set redirect URI to `https://developers.google.com/oauthplayground`.
5. Use [OAuth Playground](https://developers.google.com/oauthplayground/) to generate a refresh token for the Gmail API scope.

---

## 📜 Scripts

### Backend (`backend/package.json`)

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `npx nodemon server.js` | Start with hot-reload |
| `npm start` | `node server.js` | Production start |

### Frontend (`frontend/package.json`)

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev --port 5500` | Dev server with hot-reload |
| `npm run build` | `next build` | Production build |
| `npm start` | `next start --port 5500` | Serve production build |

### API Tests

```bash
cd backend
bash test_endpoints.sh
```

Runs 22 cURL-based API tests covering all endpoints.

---

## 📄 License

ISC

---

<p align="center">
  Built with ❤️ by <strong>KTG-LEDGER Team</strong>
</p>
