const userModel = require('../models/user.model');
const OtpModel = require('../models/otp.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/email.service');
const { tokenBlacklistModel } = require('../models/blacklist.model');

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const LOCK_DURATION_MS = LOCK_DURATION_MINUTES * 60 * 1000;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a cryptographically-secure 6-digit OTP string */
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

/** Issue a signed JWT and set it as an httpOnly cookie on the response */
function issueToken(res, user) {
    const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.EXPIRES_IN }
    );
    res.cookie('jwt_token', token, {
        httpOnly: true,
        sameSite: 'strict',
        // secure: true   ← uncomment in production (HTTPS)
    });
    return token;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/auth/me
 * Returns the currently-logged-in user from the JWT cookie.
 * Used by the frontend on every tab load to restore session state.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function getMeController(req, res) {
    // authMiddleware already validated the token and set req.user
    // Re-fetch with +systemUser so the frontend can route admin users correctly
    const userWithRole = await userModel.findById(req.user._id).select('+systemUser');
    return res.status(200).json({
        user: {
            _id: userWithRole._id,
            name: userWithRole.name,
            email: userWithRole.email,
            systemUser: userWithRole.systemUser ?? false,
        },
    });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/register
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function userRegisterController(req, res) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Missing required fields: name, email, password" });
    }

    try {
        const isExistingUser = await userModel.findOne({ email });
        if (isExistingUser) {
            return res.status(422).json({ message: "User already exists" });
        }

        const newUser = await userModel.create({ name, email, password });
        const token = issueToken(res, newUser);

        Promise.allSettled([
            emailService.sendRegistrationEmail(newUser.email, newUser.name)
        ]).catch(() => {});

        return res.status(201).json({
            message: "User registered successfully",
            user: { _id: newUser._id, name: newUser.name, email: newUser.email },
            token,
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/login
 * Supports account lockout after MAX_FAILED_ATTEMPTS consecutive failures.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function userLoginController(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Missing required fields: email, password" });
    }

    try {
        // Select password + lockout fields (all select:false)
        const user = await userModel
            .findOne({ email })
            .select('+password +failedLoginAttempts +lockUntil');

        if (!user) {
            return res.status(401).json({ message: "Email not found" });
        }

        // ── Account Lockout Check ────────────────────────────────────────────
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                message: `Account locked. Try again in ${minutesLeft} minute(s).`,
            });
        }

        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            // Increment failed attempts
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
                user.failedLoginAttempts = 0;
                await user.save();

                // Fire-and-forget: notify user of lockout
                Promise.allSettled([
                    emailService.sendAccountLockedEmail(user.email, user.name, LOCK_DURATION_MINUTES)
                ]).catch(() => {});

                return res.status(423).json({
                    message: `Account locked for ${LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`,
                });
            }

            await user.save();
            return res.status(401).json({
                message: `Password is incorrect. ${MAX_FAILED_ATTEMPTS - user.failedLoginAttempts} attempt(s) remaining.`,
            });
        }

        // ── Successful login: reset lockout counters ─────────────────────────
        if (user.failedLoginAttempts > 0 || user.lockUntil) {
            user.failedLoginAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
        }

        const token = issueToken(res, user);

        Promise.allSettled([
            emailService.sendLoginAlertEmail(
                user.email,
                user.name,
                req.ip,
                req.headers['user-agent'] ?? 'Unknown Device'
            )
        ]).catch(() => {});

        return res.status(200).json({
            message: "User logged in successfully",
            user: { _id: user._id, name: user.name, email: user.email },
            token,
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/logout
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function userLogoutController(req, res) {
    const token = req.cookies.jwt_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Authentication token is missing" });
    }

    try {
        await tokenBlacklistModel.create({ token });
    } catch (err) {
        const isDuplicate = err.code === 11000 || err.message?.includes('already blacklisted');
        if (!isDuplicate) {
            return res.status(500).json({ message: "Logout failed", error: err.message });
        }
    }

    res.clearCookie("jwt_token");
    return res.status(200).json({ message: "User logged out successfully" });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/forgot-password
 * Generates a 6-digit OTP, stores it (TTL 10 min), emails it to the user.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function forgotPasswordController(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const user = await userModel.findOne({ email });

        // Always respond 200 — don't reveal if email exists (security)
        if (!user) {
            return res.status(200).json({ message: "If that email is registered, an OTP has been sent." });
        }

        const otp = generateOTP();

        // Upsert: replace any existing OTP for this email
        await OtpModel.findOneAndUpdate(
            { email },
            { email, otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        // Fire-and-forget OTP email
        Promise.allSettled([
            emailService.sendPasswordResetOTPEmail(user.email, user.name, otp, 10)
        ]).catch(() => {});

        return res.status(200).json({ message: "If that email is registered, an OTP has been sent." });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/verify-otp
 * Validates the OTP without resetting the password yet.
 * Returns a short-lived reset token the client must include in /reset-password.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function verifyOtpController(req, res) {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

    try {
        const record = await OtpModel.findOne({ email });

        if (!record || record.otp !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // OTP is valid — issue a short-lived (15 min) reset token
        const resetToken = jwt.sign(
            { email, purpose: 'password-reset' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Delete the OTP record so it cannot be reused
        await OtpModel.deleteOne({ email });

        return res.status(200).json({ message: "OTP verified", resetToken });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/reset-password
 * Requires the resetToken from /verify-otp.  Sets the new password.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function resetPasswordController(req, res) {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
        return res.status(400).json({ message: "resetToken and newPassword are required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch {
            return res.status(400).json({ message: "Reset token is invalid or has expired" });
        }

        if (decoded.purpose !== 'password-reset') {
            return res.status(400).json({ message: "Invalid reset token" });
        }

        const user = await userModel.findOne({ email: decoded.email }).select('+password');
        if (!user) return res.status(404).json({ message: "User not found" });

        user.password = newPassword; // pre-save hook will hash it
        await user.save();

        // Fire-and-forget: notify user that password was changed
        Promise.allSettled([
            emailService.sendPasswordChangeEmail(user.email, user.name)
        ]).catch(() => {});

        return res.status(200).json({ message: "Password reset successfully. Please log in." });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/change-password   [Protected — requires auth]
 * Allows a logged-in user to change their password by providing the current one.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function changePasswordController(req, res) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    try {
        const user = await userModel.findById(req.user._id).select('+password');
        if (!user) return res.status(404).json({ message: "User not found" });

        const isValid = await user.comparePassword(currentPassword);
        if (!isValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        user.password = newPassword; // pre-save hook hashes it
        await user.save();

        // Blacklist the current token so user must log in again with new password
        const token = req.cookies.jwt_token || req.headers.authorization?.split(" ")[1];
        if (token) {
            try { await tokenBlacklistModel.create({ token }); } catch { /* already blacklisted */ }
        }
        res.clearCookie("jwt_token");

        // Fire-and-forget: notify user of password change
        Promise.allSettled([
            emailService.sendPasswordChangeEmail(user.email, user.name)
        ]).catch(() => {});

        return res.status(200).json({ message: "Password changed successfully. Please log in again." });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

module.exports = {
    getMeController,
    userRegisterController,
    userLoginController,
    userLogoutController,
    forgotPasswordController,
    verifyOtpController,
    resetPasswordController,
    changePasswordController,
};
