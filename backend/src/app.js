// This file is the entry point of the src. It instantiates the Express server and exports it for use in other parts of the application.
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

/**
 * Routes — must be required AFTER express is instantiated
 * and BEFORE they are mounted with app.use()
 */
const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');
const transactionRouter = require('./routes/transaction.routes');

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
/**
 * ⚠️ GOTCHA: express.json() and cookieParser() MUST be registered before any routes.
 * If a route is mounted before express.json(), req.body will be undefined for all
 * POST/PUT requests to that route — even if the middleware is added later in the file.
 * Express processes middleware in the exact order app.use() is called.
 */
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true  // Allow cookies to be sent cross-origin
}));
app.use(express.json());      // Parse JSON request bodies into req.body
app.use(cookieParser());      // Parse cookies into req.cookies

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/account", accountRouter);
app.use("/api/transactions", transactionRouter);

module.exports = app;


module.exports = app;