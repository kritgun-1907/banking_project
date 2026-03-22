const accountModel = require("../models/account.model");

async function createAccountController(req, res) {
    const user= req.user; // Access the authenticated user from the request object, which is set by the authMiddleware. This allows us to associate the new account with the correct user in the database.

    const account = await accountModel.create({
        user: user._id, // Set the user field of the account document to the _id of the authenticated user. This establishes a relationship between the account and the user in the database.
        status: "ACTIVE", // Set the initial status of the account to "ACTIVE". This indicates that the account is currently active and can be used for transactions.
        currency: "INR" // Set the currency of the account to "INR" (Indian Rupee). This specifies the currency in which the account will operate.
    });

    res.status(201).json({
        message: "Account created successfully",
        account: {
            _id: account._id, // MongoDB automatically creates _id When you save any document to MongoDB, it automatically generates a unique identifier field and names it _id:
            user: account.user,
            status: account.status,
            currency: account.currency
        }
    });
}

async function getUserAccountsController(req, res) {
    const user = req.user; // Access the authenticated user from the request object, which is set by the authMiddleware. This allows us to retrieve the accounts associated with the correct user from the database.

    const accounts = await accountModel.find({ user: user._id }); // Use the find method of the account model to retrieve all account documents from the database that are associated with the authenticated user's _id. This will return an array of account documents that belong to the user.

    res.status(200).json({
        message: "Accounts retrieved successfully",
        accounts: accounts.map(account => ({
            _id: account._id,
            user: account.user,
            status: account.status,
            currency: account.currency
        }))
    });
}

async function getAccountBalanceController(req, res) {
    const user = req.user; // Access the authenticated user from the request object, which is set by the authMiddleware. This allows us to ensure that we are retrieving the balance for an account that belongs to the authenticated user.
    const { accountId } = req.params; // Extract the accountId from the request parameters. This allows us to identify which account's balance we want to retrieve.
    const account = await accountModel.findOne({ _id: accountId, user: user._id });

    if (!account) {
        return res.status(404).json({ message: "Account not found" });
    }

    const balance = await account.getCurrentBalance(); // Call the getCurrentBalance method defined in the account model to calculate the current balance of the specified account. This method uses an aggregation pipeline to sum up all CREDIT and DEBIT entries in the ledger for that account and returns the calculated balance.

    res.status(200).json({
        message: "Account balance retrieved successfully",
        accountId: account._id,
        balance: balance
    });
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
};