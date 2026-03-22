const express = require('express');
const authMiddleware = require("../middlewares/auth.middleware");
const accountController = require("../controllers/account.controller");


const router = express.Router();

/**
 * -POST /api/accounts/
 * -Create a new account
 * -Protected route, requires authentication
 */
router.post('/', authMiddleware.authMiddleware, accountController.createAccountController); // This line defines a route for handling POST requests to the /api/accounts/ endpoint. It uses the post method of the router instance to specify that this route should only respond to POST requests. The second argument is the authMiddleware function imported from the auth.middleware.js file, which will be executed before the accountController.createAccountController function. This means that the authMiddleware will first check if the user is authenticated before allowing access to the createAccountController, which is responsible for creating a new account. This route is protected, meaning that only authenticated users can access it to create new accounts in the application.    

/**
 * -GET /api/accounts/
 * -Get all accounts for the authenticated user
 * -Protected route, requires authentication
 */
router.get('/', authMiddleware.authMiddleware, accountController.getUserAccountsController); // This line defines a route for handling GET requests to the /api/accounts/ endpoint. It uses the get method of the router instance to specify that this route should only respond to GET requests. The second argument is the authMiddleware function imported from the auth.middleware.js file, which will be executed before the accountController.getUserAccountsController function. This means that the authMiddleware will first check if the user is authenticated before allowing access to the getUserAccountsController, which is responsible for retrieving all accounts associated with the authenticated user. This route is protected, meaning that only authenticated users can access it to view their accounts in the application.

/**
 * -GET /api/accounts/balance/:accountId
 * -Get the balance of a specific account
 * -Protected route, requires authentication
 */
router.get('/balance/:accountId', authMiddleware.authMiddleware, accountController.getAccountBalanceController);

module.exports = router;