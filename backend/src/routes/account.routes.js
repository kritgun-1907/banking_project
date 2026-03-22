const express = require('express');
// ⚠️ FIX: Folder is 'middleware' (no 's') — '../middlewares/...' would crash the server on startup.
const { authMiddleware } = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");


const router = express.Router();

/**
 * -POST /api/accounts/
 * -Create a new account
 * -Protected route, requires authentication
 */
router.post('/', authMiddleware, accountController.createAccountController);

/**
 * -GET /api/accounts/
 * -Get all accounts for the authenticated user
 * -Protected route, requires authentication
 */
router.get('/', authMiddleware, accountController.getUserAccountsController);

/**
 * -GET /api/accounts/balance/:accountId
 * -Get the balance of a specific account
 * -Protected route, requires authentication
 */
router.get('/balance/:accountId', authMiddleware, accountController.getAccountBalanceController);

module.exports = router;