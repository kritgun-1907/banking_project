const transactionModel = require("../models/transaction.model");
const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// SHARED INTERNAL HELPER
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @function _executeTransfer
 * @description Internal helper that performs the ATOMIC core of every fund transfer:
 *   1. Creates a PENDING transaction document.
 *   2. Creates a DEBIT ledger entry on the sender's account.
 *   3. Creates a CREDIT ledger entry on the receiver's account.
 *   4. Marks the transaction as COMPLETED.
 *   5. Commits the session.
 *
 * WHY A SHARED HELPER?
 * Both `createTransactionController` (user-to-user transfers) and
 * `createIntialFundsTransaction` (system-to-user seeding) share the exact same
 * session/ledger write pattern. Extracting it here means:
 *   ✅ One place to update if the transaction schema changes (e.g. adding a `description` field).
 *   ✅ Both controllers are guaranteed to write ledger entries the same way.
 *   ✅ The controllers stay focused on their own validation/business logic.
 *
 * ⚠️ This is NOT an Express route handler — it has no (req, res). It is a plain async
 *    function called internally by controllers. It throws on failure so the caller's
 *    catch block handles the abort + response.
 *
 * ⚠️ The session is started and committed INSIDE this helper. The caller must NOT
 *    start their own session before calling this — that would create a nested session
 *    which MongoDB does not support and will throw an error.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.fromAccountId - The _id of the sender's account.
 * @param {string|mongoose.Types.ObjectId} params.toAccountId   - The _id of the receiver's account.
 * @param {number}                          params.amount        - The amount to transfer (must be > 0).
 * @param {string}                          params.idempotencyKey - Unique key for this transfer attempt.
 * @returns {Promise<mongoose.Document>} The completed transaction document.
 * @throws {Error} If any DB operation fails — caller is responsible for handling the error.
 */
async function _executeTransfer({ fromAccountId, toAccountId, amount, idempotencyKey }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        /**
         * STEP A: Create the transaction document with status "PENDING".
         *
         * We use array syntax ([{...}]) because Mongoose's Model.create() with a session
         * requires documents to be wrapped in an array. It returns an array, so we
         * always access transaction[0].
         *
         * Status starts as "PENDING" — we only upgrade to "COMPLETED" AFTER both ledger
         * entries are successfully written. If anything fails mid-way, the session rollback
         * removes this document too, so no orphaned PENDING records are ever left behind.
         *
         * ─── HOW RACE CONDITIONS ARE HANDLED HERE ────────────────────────────
         * The soft idempotency check in the controllers (findOne → check status) has a
         * race window: two simultaneous requests can BOTH read null for the same key and
         * BOTH proceed past the check at the same time.
         *
         * The TRUE protection is the `unique: true` index on the `idempotencyKey` field
         * in transactionSchema. MongoDB enforces this at the database level — only ONE
         * write can ever succeed for a given key. The second concurrent write will throw
         * a MongoServerError with code 11000 (duplicate key error).
         *
         * We catch that specific error below and convert it into a clean 409 response
         * instead of letting it become a generic 500 crash.
         *
         * This is the "optimistic concurrency" pattern:
         *   - Don't pessimistically lock before writing (slow, complex).
         *   - Instead, attempt the write and handle the collision gracefully if it occurs.
         * ─────────────────────────────────────────────────────────────────────
         */
        const transaction = await transactionModel.create(
            [{
                fromAccount: fromAccountId,
                toAccount: toAccountId,
                amount,
                idempotencyKey,
                status: "PENDING"
            }],
            { session }
        );

        /**
         * STEP B: Create DEBIT entry on the sender's account.
         *
         * Double-entry bookkeeping rule: every transfer always produces EXACTLY two ledger entries —
         * one DEBIT (money leaving) and one CREDIT (money arriving). The amounts are always equal.
         * This ensures the total sum of all ledger entries across all accounts is always zero —
         * a fundamental invariant of any sound financial system.
         *
         * Both entries reference the same transaction._id to permanently link them as a pair.
         * The `immutable: true` flag on the ledger schema ensures these can never be edited —
         * they form an append-only audit trail.
         *
         * ⚠️ GOTCHA: ledgerModel.create() with a session also requires ARRAY syntax.
         *    Using a plain object bypasses the session binding and the write happens
         *    outside the transaction — it won't be rolled back if the session aborts.
         */
        await ledgerModel.create(
            [{
                account: fromAccountId,
                type: "DEBIT",
                amount,
                transaction: transaction[0]._id
            }],
            { session }
        );

        /**
         * STEP C: Create CREDIT entry on the receiver's account.
         */
        await ledgerModel.create(
            [{
                account: toAccountId,
                type: "CREDIT",
                amount,
                transaction: transaction[0]._id
            }],
            { session }
        );

        /**
         * STEP D: Mark the transaction as COMPLETED and save within the session.
         *
         * ⚠️ GOTCHA: Must pass { session } here. Without it, this .save() runs OUTSIDE
         *    the transaction. If the commit later fails, the status change would still
         *    persist — leaving a "COMPLETED" transaction with no ledger entries in the DB.
         */
        transaction[0].status = "COMPLETED";
        await transaction[0].save({ session });

        /**
         * STEP E: Commit — atomically makes all writes (transaction doc + 2 ledger entries
         * + status update) visible to the rest of the database at the same instant.
         * Before this call, none of the writes are visible to any other query.
         */
        await session.commitTransaction();

        return transaction[0];

    } catch (error) {
        /**
         * Roll back ALL writes in this session. The database is restored to its exact
         * state before session.startTransaction() was called — as if nothing happened.
         *
         * ⚠️ abortTransaction() itself can throw (e.g. network failure), so we swallow
         *    that error to ensure the finally block always runs.
         */
        try {
            await session.abortTransaction();
        } catch (abortError) {
            console.error("[_executeTransfer] Failed to abort session:", abortError);
        }

        /**
         * MongoDB duplicate key error code is 11000.
         * This fires when two simultaneous requests both passed the soft idempotency
         * check (findOne → null) and both tried to create a transaction document with
         * the same idempotencyKey at the same time. The unique index on idempotencyKey
         * ensures only ONE of them succeeds — the other gets this error.
         *
         * We convert it into a specific typed error so the calling controller can
         * detect it and return a clean 409 "already in progress" response instead of
         * a generic 500 server error.
         *
         * error.code === 11000        → Plain MongoServerError (direct driver throw)
         * error.code === 11000 inside a WriteError → surfaces as error.writeErrors[0].code
         * We check both to cover all Mongoose/driver versions.
         */
        const isDuplicateKeyError =
            error.code === 11000 ||
            (error.writeErrors && error.writeErrors[0]?.code === 11000);

        if (isDuplicateKeyError) {
            const conflict = new Error("A transaction with this idempotencyKey is already being processed.");
            conflict.isIdempotencyConflict = true; // Custom flag for the caller to detect
            throw conflict;
        }

        throw error; // Re-throw all other errors so the controller handles them as 500.

    } finally {
        /**
         * Always release the session back to the MongoDB connection pool.
         * Without this, the connection is leaked and the pool will eventually
         * be exhausted, causing all DB operations in the app to hang indefinitely.
         */
        session.endSession();
    }
}

/**
 * @controller createTransactionController
 * @route POST /api/transactions
 * @description Handles the creation of a new financial transaction between two accounts.
 * This controller implements a 10-step transaction process to ensure data integrity,
 * idempotency, and security for every fund transfer.
 *
 * THE 10-STEP TRANSACTION PROCESS:
 * 1.  Validate the request body — ensure all required fields are present.
 * 2.  Idempotency check — prevent duplicate transactions using a unique key.
 * 3.  Account existence & status check — both accounts must exist and be ACTIVE.
 * 4.  Balance check — derive sender's balance from the Ledger and verify sufficient funds.
 * 5.  Start a MongoDB session & begin a transaction — groups all DB writes atomically.
 * 6.  Create a PENDING transaction document in the database.
 * 7.  Create DEBIT ledger entry for fromAccount and CREDIT ledger entry for toAccount.
 * 8.  Mark the transaction as COMPLETED and save it within the session.
 * 9.  Commit the MongoDB session — makes all changes permanent at once.
 * 10. Send email notifications to the sender and receiver (for security & UX).
 *
 * @param {import('express').Request} req - Express request object. Expected body: { fromAccount, toAccount, amount, idempotencyKey }
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function createTransactionController(req, res) {

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Validate request body
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * We expect four fields in the request body:
     * - fromAccount: MongoDB ObjectId of the sender's account
     * - toAccount:   MongoDB ObjectId of the receiver's account
     * - amount:      Numeric value of money to transfer (must be > 0)
     * - idempotencyKey: A unique string (e.g. UUID) generated by the CLIENT for each
     *                   transaction attempt. This is the most important safety net — if
     *                   the client retries a request due to a network error, the server
     *                   will recognise the same key and return the original result instead
     *                   of processing it twice. Without this, a user could be double-charged.
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "Missing required fields: fromAccount, toAccount, amount, idempotencyKey" });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Transaction amount must be greater than 0" });
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({ message: "fromAccount and toAccount cannot be the same account" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Idempotency key check
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Before doing anything else, check if a transaction with this idempotencyKey
     * already exists in the database. This must be done BEFORE account/balance checks
     * because we want to return the cached result immediately regardless of current
     * account state.
     *
     * Possible states of the existing transaction:
     * - COMPLETED → The transaction already succeeded. Return 200 with the original result.
     * - PENDING   → The transaction is still being processed (e.g. a previous request is in-flight).
     *               Return 202 to tell the client to wait and retry.
     * - REFUNDED  → The transaction was previously completed but then reversed. Return 409 Conflict.
     * - FAILED    → The previous attempt failed. Return 400 so the client can retry with a NEW key.
     *
     * ⚠️ GOTCHA: A FAILED transaction with the same key should NOT be retried with the same key.
     * The client must generate a fresh idempotencyKey for each new attempt to avoid ambiguity.
     */
    const isTransactionAlreadyExist = await transactionModel.findOne({ idempotencyKey });

    if (isTransactionAlreadyExist) {
        if (isTransactionAlreadyExist.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transactionId: isTransactionAlreadyExist._id,
                status: isTransactionAlreadyExist.status
            });
        } else if (isTransactionAlreadyExist.status === "PENDING") {
            // 202 Accepted is more semantically correct here than 200 OK —
            // it tells the client "we have the request but it's not done yet".
            return res.status(202).json({
                message: "Transaction is currently being processed. Please retry shortly.",
                transactionId: isTransactionAlreadyExist._id,
                status: isTransactionAlreadyExist.status
            });
        } else if (isTransactionAlreadyExist.status === "REFUNDED") {
            // 409 Conflict: the transaction exists but is in a terminal REFUNDED state.
            return res.status(409).json({
                message: "This transaction was previously refunded. Please initiate a new transaction.",
                transactionId: isTransactionAlreadyExist._id,
                status: isTransactionAlreadyExist.status
            });
        } else {
            // FAILED state — the previous attempt failed. Do not reuse the same key.
            return res.status(400).json({
                message: "Previous transaction attempt failed. Please retry with a new idempotencyKey.",
                transactionId: isTransactionAlreadyExist._id,
                status: isTransactionAlreadyExist.status
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Verify both accounts exist and are ACTIVE
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * We fetch both accounts in parallel using Promise.all() for efficiency.
     * The query already filters by status: "ACTIVE", so if either account is
     * FROZEN or CLOSED (or simply doesn't exist), findOne() returns null and
     * we immediately reject the transaction.
     *
     * ⚠️ GOTCHA: We do NOT need a separate status check after this point —
     * the { status: "ACTIVE" } filter in findOne already guarantees that both
     * accounts are active if they are returned. A redundant check would be dead code.
     */
    const [fromUserAccount, toUserAccount] = await Promise.all([
        accountModel.findOne({ _id: fromAccount, status: "ACTIVE" }),
        accountModel.findOne({ _id: toAccount, status: "ACTIVE" })
    ]);

    if (!fromUserAccount || !toUserAccount) {
        return res.status(404).json({ message: "One or both accounts not found or are not active" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Check if fromAccount has sufficient balance
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * We derive the balance by running an aggregation pipeline on the Ledger collection
     * (see account.model.js → getCurrentBalance). We do NOT store balance directly on the
     * account document — instead, balance is always CALCULATED from ledger entries.
     *
     * This is a core principle of double-entry bookkeeping: the ledger is the source of
     * truth. For every transaction, there is a DEBIT entry (money leaving an account) and
     * a CREDIT entry (money entering an account). Balance = sum(CREDITS) - sum(DEBITS).
     *
     * ⚠️ GOTCHA: This balance check is a soft pre-check done OUTSIDE the session. There is
     * a small race condition window where another transaction could drain the balance between
     * this check and the session commit. For production systems, this should be re-validated
     * INSIDE the session using a read concern of "snapshot" to get a consistent view of data.
     */
    const balance = await fromUserAccount.getCurrentBalance();

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient funds. Current balance: ${balance}, requested amount: ${amount}`
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEPS 5–9: Execute the atomic transfer via shared helper
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * We delegate all session/ledger/commit logic to _executeTransfer().
     * This keeps the controller focused purely on HTTP concerns (validation,
     * auth checks, request parsing, response formatting) while the helper
     * owns the database transaction mechanics.
     *
     * If _executeTransfer() throws for any reason, the session is already
     * aborted inside the helper before the error reaches here — so we only
     * need to handle the HTTP response in the catch block below.
     */
    try {
        const transaction = await _executeTransfer({
            fromAccountId: fromAccount,
            toAccountId: toAccount,
            amount,
            idempotencyKey
        });

        // ── Send email notifications AFTER successful commit ──────────────────
        /**
         * Emails are intentionally sent AFTER _executeTransfer() returns, meaning
         * AFTER the session is committed. We never notify users about a transaction
         * that hasn't been finalized yet.
         *
         * Promise.allSettled() ensures a failed email (e.g. SMTP timeout) never
         * causes the HTTP response to become a 500 — the transaction is already
         * committed and that outcome must not be affected by email delivery.
         */
        await Promise.allSettled([
            emailService.sendTransactionAlertEmail(
                fromUserAccount.user?.email ?? req.user.email,
                req.user.name,
                'debited',
                amount,
                balance - amount,
                `Transfer to account ${toAccount}`
            ),
            emailService.sendTransactionAlertEmail(
                toUserAccount.user?.email ?? req.user.email,
                toUserAccount.user?.name ?? 'Account Holder',
                'credited',
                amount,
                balance + amount,
                `Transfer from account ${fromAccount}`
            )
        ]);

        return res.status(201).json({
            message: "Transaction completed successfully",
            transactionId: transaction._id,
            status: transaction.status
        });

    } catch (error) {
        // ── Idempotency race condition — two simultaneous requests, same key ──
        /**
         * This branch fires when the soft findOne() check above was bypassed by
         * a true race (two requests arriving simultaneously) and the unique index
         * in MongoDB caught the collision. We surface it as a 409 Conflict so the
         * client knows to wait and retry rather than thinking it's a server error.
         */
        if (error.isIdempotencyConflict) {
            return res.status(409).json({
                message: "A transaction with this idempotencyKey is already being processed. Please wait and retry shortly.",
            });
        }
        console.error("[createTransactionController] Transaction failed:", error);
        return res.status(500).json({
            message: "Transaction failed due to a server error. No funds have been moved.",
            error: error.message
        });
    }
}

/**
 * @controller createIntialFundsTransaction
 * @route POST /api/transactions/system/initial-funds
 * @description Admin-only utility to seed a user account with initial funds sourced from
 * the internal system account. This simulates a bank issuing funds to a new customer account
 * (e.g. account opening bonus, initial deposit). It follows the same double-entry bookkeeping
 * model as regular transactions: a DEBIT is recorded against the system account and a CREDIT
 * is recorded against the target user account.
 *
 * ⚠️ This route must be protected by adminMiddleware — only system users should be able to call it.
 *    A regular user calling this endpoint could create unlimited funds out of thin air.
 *
 * @param {import('express').Request} req - Express request. Expected body: { toAccount, amount, idempotencyKey }
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<void>}
 */
async function createIntialFundsTransaction(req, res) {

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Validate request body
    // ─────────────────────────────────────────────────────────────────────────
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "Missing required fields: toAccount, amount, idempotencyKey" });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Transaction amount must be greater than 0" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Idempotency check
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Even for system/admin operations, idempotency is critical. Without this check,
     * retrying a failed HTTP request would credit the user account multiple times,
     * creating funds from nothing. The same key must always return the same result.
     */
    const existingTransaction = await transactionModel.findOne({ idempotencyKey });

    if (existingTransaction) {
        if (existingTransaction.status === "COMPLETED") {
            return res.status(200).json({
                message: "Initial funds transaction already processed",
                transactionId: existingTransaction._id,
                status: existingTransaction.status
            });
        } else if (existingTransaction.status === "PENDING") {
            return res.status(202).json({
                message: "Initial funds transaction is currently being processed. Please retry shortly.",
                transactionId: existingTransaction._id,
                status: existingTransaction.status
            });
        } else {
            // FAILED or REFUNDED — do not reuse the key
            return res.status(400).json({
                message: "Previous initial funds transaction attempt failed or was refunded. Please retry with a new idempotencyKey.",
                transactionId: existingTransaction._id,
                status: existingTransaction.status
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Verify the destination account exists and is ACTIVE
    // ─────────────────────────────────────────────────────────────────────────
    const toUserAccount = await accountModel.findOne({ _id: toAccount, status: "ACTIVE" });

    if (!toUserAccount) {
        return res.status(404).json({ message: "Destination account not found or is not active" });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Locate the system account
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * The system account is a special internal account identified by { systemUser: true }.
     * It acts as the bank's own reserve account — the source of all initially issued funds.
     * If this account is missing or inactive, the operation must fail immediately because
     * we have no valid "from" party to record the DEBIT against. Without a DEBIT entry
     * on the system side, the double-entry bookkeeping would be broken (only a CREDIT
     * would exist, meaning funds appeared from nowhere with no corresponding offset).
     *
     * ⚠️ GOTCHA: The `systemUser` field must exist on the accountSchema. Make sure it is
     *    defined in account.model.js. If not, this query will always return null.
     */
    const systemAccount = await accountModel.findOne({ systemUser: true, status: "ACTIVE" });

    if (!systemAccount) {
        return res.status(500).json({ message: "System account not found or not active. Cannot issue funds." });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEPS 5–9: Execute the atomic transfer via shared helper
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * WHY NOT WRITE DIRECTLY TO THE DB HERE?
     * You might think: "this is an internal admin operation, why not just call
     * transactionModel.create() and ledgerModel.create() directly?"
     *
     * The answer is: we ARE writing directly to the DB — _executeTransfer() does
     * exactly that. The point is NOT to go through the HTTP route for
     * createTransactionController (that would be a self-HTTP-call anti-pattern).
     * Instead, we call the shared internal helper function directly, which gives us:
     *   ✅ The same atomic session guarantees (DEBIT + CREDIT either both happen or neither does).
     *   ✅ A single place to maintain the ledger write logic for the whole app.
     *   ✅ No need to fabricate a fake req/res to reuse the other controller.
     *
     * The KEY difference from createTransactionController is that the `fromAccount`
     * here is always the systemAccount — the caller (admin) never supplies it in
     * the request body. The business logic (balance check, self-transfer guard) is
     * deliberately NOT applied here because the system account is a special reserve
     * account with different rules.
     */
    try {
        const transaction = await _executeTransfer({
            fromAccountId: systemAccount._id,
            toAccountId: toAccount,
            amount,
            idempotencyKey
        });

        // Send email to the receiving user AFTER the commit is confirmed.
        await Promise.allSettled([
            emailService.sendTransactionAlertEmail(
                req.user.email,
                req.user.name,
                'credited',
                amount,
                amount, // First deposit — their new balance equals the credited amount
                'Initial funds issued by system'
            )
        ]);

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transactionId: transaction._id,
            status: transaction.status
        });

    } catch (error) {
        if (error.isIdempotencyConflict) {
            return res.status(409).json({
                message: "An initial funds transaction with this idempotencyKey is already being processed. Please wait and retry shortly.",
            });
        }
        console.error("[createIntialFundsTransaction] Failed:", error);
        return res.status(500).json({
            message: "Initial funds transaction failed. No funds have been moved.",
            error: error.message
        });
    }
}

module.exports = {
    createTransactionController,
    createIntialFundsTransaction
};