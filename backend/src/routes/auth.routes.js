const express = require('express');
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────

/** POST /api/auth/register */
router.post('/register', authController.userRegisterController);

/** POST /api/auth/login */
router.post('/login', authController.userLoginController);

/** POST /api/auth/logout */
router.post('/logout', authController.userLogoutController);

/** POST /api/auth/forgot-password  — send OTP email */
router.post('/forgot-password', authController.forgotPasswordController);

/** POST /api/auth/verify-otp  — validate OTP, receive resetToken */
router.post('/verify-otp', authController.verifyOtpController);

/** POST /api/auth/reset-password  — exchange resetToken for new password */
router.post('/reset-password', authController.resetPasswordController);

// ── Protected routes (require valid JWT cookie) ───────────────────────────────

/** GET /api/auth/me  — rehydrate session from JWT cookie (multi-tab support) */
router.get('/me', authMiddleware, authController.getMeController);

/** POST /api/auth/change-password  — change password while logged in */
router.post('/change-password', authMiddleware, authController.changePasswordController);

module.exports = router;
