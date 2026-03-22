const { Router } = require('express');
const { adminMiddleware } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const adminRouter = Router();

// All routes here are protected by adminMiddleware (systemUser: true required)

/** GET /api/admin/users — all regular users with accounts + live balances */
adminRouter.get('/users', adminMiddleware, adminController.getAllUsersController);

/** GET /api/admin/stats — platform-wide stats for the dashboard header */
adminRouter.get('/stats', adminMiddleware, adminController.getStatsController);

/** POST /api/admin/initial-funds — issue funds from system account to a user account */
adminRouter.post('/initial-funds', adminMiddleware, adminController.issueInitialFundsController);

module.exports = adminRouter;
