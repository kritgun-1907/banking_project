const accountModel = require("../models/account.model");

async function createAccountController(req, res) {
    const user= req.user;

    try {
        const account = await accountModel.create({
            user: user._id,
            status: "ACTIVE",
            currency: "INR"
        });

        res.status(201).json({
            message: "Account created successfully",
            account: {
                _id: account._id,
                user: account.user,
                status: account.status,
                currency: account.currency
            }
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

async function getUserAccountsController(req, res) {
    const user = req.user;

    try {
        const accounts = await accountModel.find({ user: user._id });

        res.status(200).json({
            message: "Accounts retrieved successfully",
            accounts: accounts.map(account => ({
                _id: account._id,
                user: account.user,
                status: account.status,
                currency: account.currency
            }))
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

async function getAccountBalanceController(req, res) {
    const user = req.user;
    const { accountId } = req.params;

    try {
        const account = await accountModel.findOne({ _id: accountId, user: user._id });

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        const balance = await account.getCurrentBalance();

        res.status(200).json({
            message: "Account balance retrieved successfully",
            accountId: account._id,
            balance: balance
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController
};