/**
 * @file admin.controller.js
 * @description Admin-only controllers for the system-user super-admin dashboard.
 *
 * All functions here are protected by adminMiddleware — req.user is always a systemUser.
 *
 * Endpoints provided:
 *  GET  /api/admin/users                    — All regular users with their accounts & live balances
 *  GET  /api/admin/stats                    — Platform-wide stats (total users, accounts, volume)
 *  POST /api/admin/initial-funds            — Issue initial funds from system account to any account
 */

const userModel    = require('../models/user.model');
const accountModel = require('../models/account.model');
const transactionModel = require('../models/transaction.model');
const emailService = require('../services/email.service');
const mongoose     = require('mongoose');
const ledgerModel  = require('../models/ledger.model');

// ─── Internal helpers (same pattern as transaction.controller.js) ─────────────

async function _executeTransfer({ fromAccountId, toAccountId, amount, idempotencyKey }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const transaction = await transactionModel.create(
            [{ fromAccount: fromAccountId, toAccount: toAccountId, amount, idempotencyKey, status: 'PENDING' }],
            { session }
        );
        await ledgerModel.create(
            [{ account: fromAccountId, type: 'DEBIT',  amount, transaction: transaction[0]._id }],
            { session }
        );
        await ledgerModel.create(
            [{ account: toAccountId,   type: 'CREDIT', amount, transaction: transaction[0]._id }],
            { session }
        );
        transaction[0].status = 'COMPLETED';
        await transaction[0].save({ session });
        await session.commitTransaction();
        return transaction[0];
    } catch (error) {
        try { await session.abortTransaction(); } catch {}
        const isDupe = error.code === 11000 || error.writeErrors?.[0]?.code === 11000;
        if (isDupe) {
            const e = new Error('Idempotency conflict');
            e.isIdempotencyConflict = true;
            throw e;
        }
        throw error;
    } finally {
        session.endSession();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// Returns all non-system users, their accounts, and live balances.
// ─────────────────────────────────────────────────────────────────────────────
async function getAllUsersController(req, res) {
    try {
        // All regular (non-system) users
        const users = await userModel
            .find({ systemUser: { $ne: true } })
            .select('name email createdAt')
            .lean();

        // All accounts for those users, populated with user info
        const userIds = users.map(u => u._id);
        const accounts = await accountModel
            .find({ user: { $in: userIds } })
            .select('_id user status currency createdAt')
            .lean();

        // Compute live balance for every account via aggregation
        const Ledger = mongoose.model('ledger');
        const balanceAgg = await Ledger.aggregate([
            { $match: { account: { $in: accounts.map(a => a._id) } } },
            {
                $group: {
                    _id: '$account',
                    totalCredit: { $sum: { $cond: [{ $eq: ['$type', 'CREDIT'] }, '$amount', 0] } },
                    totalDebit:  { $sum: { $cond: [{ $eq: ['$type', 'DEBIT']  }, '$amount', 0] } },
                }
            },
            { $project: { balance: { $subtract: ['$totalCredit', '$totalDebit'] } } }
        ]);

        // Build a balance lookup map: accountId → balance
        const balanceMap = {};
        balanceAgg.forEach(b => { balanceMap[b._id.toString()] = b.balance; });

        // Build a user lookup map: userId → user
        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = { ...u, accounts: [] }; });

        // Attach accounts (with balance) to their owner
        accounts.forEach(acc => {
            const uid = acc.user.toString();
            if (userMap[uid]) {
                userMap[uid].accounts.push({
                    _id:      acc._id,
                    status:   acc.status,
                    currency: acc.currency,
                    balance:  balanceMap[acc._id.toString()] ?? 0,
                    createdAt: acc.createdAt,
                });
            }
        });

        return res.status(200).json({
            message: 'Users retrieved successfully',
            users: Object.values(userMap),
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
// Platform-wide aggregated statistics for the admin dashboard header.
// ─────────────────────────────────────────────────────────────────────────────
async function getStatsController(req, res) {
    try {
        const [userCount, accountCount, txnAgg, systemUser] = await Promise.all([
            userModel.countDocuments({ systemUser: { $ne: true } }),
            accountModel.countDocuments({ status: 'ACTIVE' }),
            transactionModel.aggregate([
                { $match: { status: 'COMPLETED' } },
                { $group: { _id: null, totalVolume: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            userModel.findOne({ systemUser: true }).select('+systemUser').lean(),
        ]);

        // System account balance
        let systemBalance = 0;
        if (systemUser) {
            const sysAccount = await accountModel.findOne({ user: systemUser._id, status: 'ACTIVE' }).lean();
            if (sysAccount) {
                const Ledger = mongoose.model('ledger');
                const agg = await Ledger.aggregate([
                    { $match: { account: sysAccount._id } },
                    {
                        $group: {
                            _id: null,
                            totalCredit: { $sum: { $cond: [{ $eq: ['$type', 'CREDIT'] }, '$amount', 0] } },
                            totalDebit:  { $sum: { $cond: [{ $eq: ['$type', 'DEBIT']  }, '$amount', 0] } },
                        }
                    }
                ]);
                systemBalance = agg[0] ? agg[0].totalCredit - agg[0].totalDebit : 0;
            }
        }

        return res.status(200).json({
            message: 'Stats retrieved successfully',
            stats: {
                totalUsers:       userCount,
                activeAccounts:   accountCount,
                totalTransactions: txnAgg[0]?.count ?? 0,
                totalVolume:       txnAgg[0]?.totalVolume ?? 0,
                systemBalance,
            }
        });
    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/initial-funds
// Issue funds from the system account to a target user account.
// Body: { toAccount, amount, idempotencyKey }
// ─────────────────────────────────────────────────────────────────────────────
async function issueInitialFundsController(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: 'Missing required fields: toAccount, amount, idempotencyKey' });
    }
    if (amount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    try {
        // Idempotency guard
        const existing = await transactionModel.findOne({ idempotencyKey });
        if (existing) {
            if (existing.status === 'COMPLETED') {
                return res.status(200).json({ message: 'Already processed', transactionId: existing._id, status: existing.status });
            }
            return res.status(202).json({ message: 'Already in progress', transactionId: existing._id, status: existing.status });
        }

        // Verify destination account
        const destAccount = await accountModel.findOne({ _id: toAccount, status: 'ACTIVE' }).populate('user', 'name email');
        if (!destAccount) {
            return res.status(404).json({ message: 'Destination account not found or not active' });
        }

        // Locate system account
        const systemUser = await userModel.findOne({ systemUser: true }).select('+systemUser');
        if (!systemUser) return res.status(500).json({ message: 'System user not found' });

        const systemAccount = await accountModel.findOne({ user: systemUser._id, status: 'ACTIVE' });
        if (!systemAccount) return res.status(500).json({ message: 'System account not found or not active' });

        // Execute atomic transfer
        const transaction = await _executeTransfer({
            fromAccountId: systemAccount._id,
            toAccountId:   toAccount,
            amount,
            idempotencyKey,
        });

        // Notify recipient
        if (destAccount.user?.email) {
            Promise.allSettled([
                emailService.sendTransactionAlertEmail(
                    destAccount.user.email,
                    destAccount.user.name,
                    'credited',
                    amount,
                    amount,
                    'Initial funds issued by system administrator'
                )
            ]).catch(() => {});
        }

        return res.status(201).json({
            message: 'Initial funds issued successfully',
            transactionId: transaction._id,
            status: transaction.status,
            amount,
            toAccount,
        });
    } catch (err) {
        if (err.isIdempotencyConflict) {
            return res.status(409).json({ message: 'Idempotency conflict — please retry with a new key.' });
        }
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
}

module.exports = {
    getAllUsersController,
    getStatsController,
    issueInitialFundsController,
};
