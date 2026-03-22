const { Router } = require('express');
// ⚠️ Both authMiddleware and adminMiddleware live in the SAME file — import once and destructure.
// The folder is named 'middleware' (no 's') — using '../middlewares/...' would cause a
// "Cannot find module" crash at startup.
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * @route   POST /api/transactions/
 * @desc    Create a new transaction between two user accounts (debit sender, credit receiver).
 * @access  Protected — requires a valid JWT (any authenticated user).
 * @middleware authMiddleware — verifies the JWT and attaches req.user before the controller runs.
 */
transactionRoutes.post(
    '/',
    authMiddleware,
    transactionController.createTransactionController
);

/**
 * @route   POST /api/transactions/system/initial-funds
 * @desc    Seeds a user account with initial funds from the system account.
 *          Used to credit a real user account from the internal system/bank account.
 *          This is an admin-only operation — regular users must not be able to call this.
 * @access  Admin only — requires a valid JWT belonging to a system user (systemUser: true).
 * @middleware adminMiddleware — verifies the JWT AND checks that the user is a system user.
 *
 * ⚠️ NOTE: The route name is /system/initial-funds (not /initial-funds) to clearly signal
 *    this is an internal/system-level operation, helping avoid accidental public exposure.
 *
 * ⚠️ NOTE: The controller export is named `createIntialFundsTransaction` (typo: "Intial").
 *    It is referenced correctly here. Consider renaming it to `createInitialFundsTransaction`
 *    in the controller and this file together to fix the typo.
 */
transactionRoutes.post(
    '/system/initial-funds',
    adminMiddleware,
    transactionController.createIntialFundsTransaction
);

module.exports = transactionRoutes;