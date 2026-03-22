const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const { tokenBlacklistModel } = require('../models/blacklist.model');


/**
 * - User Registration Controller
 * - Path: POST /api/auth/register
 */
async function userRegisterController(req, res) {
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Missing required fields: name, email, password" });
    }

    try {
        /**
         * ⚠️ FIX: was `user.model.findOne()` (undefined) — corrected to `userModel.findOne()`
         * The variable holding the imported model is `userModel`, not `user.model`.
         */
        const isExistingUser = await userModel.findOne({ email });

        if (isExistingUser) {
            return res.status(422).json({ message: "User already exists" });
        }

        const newUser = await userModel.create({ name, email, password });

        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.EXPIRES_IN }
        );

        /**
         * ⚠️ Security: httpOnly prevents JS from reading the cookie (XSS protection).
         * secure: true should be enabled in production (HTTPS only).
         * sameSite: 'strict' prevents the cookie from being sent on cross-site requests (CSRF protection).
         */
        res.cookie('jwt_token', token, { httpOnly: true, sameSite: 'strict' });

        /**
         * ⚠️ FIX: sendRegistrationEmail was called in login, not here. Moved to register.
         * Fire-and-forget: do NOT await — email must never block the HTTP response.
         * If the SMTP server is down/slow, the user still gets their 201 immediately.
         */
        Promise.allSettled([
            emailService.sendRegistrationEmail(newUser.email, newUser.name)
        ]).catch(() => {});

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email
            },
            token
        });

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

/**
 * - User Login Controller
 * - Path: POST /api/auth/login
 */
async function userLoginController(req, res) {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Missing required fields: email, password" });
    }

    try {
        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: "Email not found" });
        }

        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            return res.status(401).json({ message: "Password is incorrect" });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.EXPIRES_IN }
        );

        res.cookie('jwt_token', token, { httpOnly: true, sameSite: 'strict' });

        /**
         * ⚠️ FIX: Removed sendRegistrationEmail from login — it belongs in register only.
         * Login should send a login alert email instead (security notification).
         * Fire-and-forget: do NOT await — email must never block the HTTP response.
         */
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
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            },
            token
        });

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
}

/**
 * - User Logout Controller
 * - Path: POST /api/auth/logout
 */
async function userLogoutController(req, res) {
    /**
     * ⚠️ FIX: Cookie is set as 'jwt_token' but was being read as 'token' — always undefined.
     * Both cookie name and Authorization header extraction are now consistent.
     */
    const token = req.cookies.jwt_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Authentication token is missing" });
    }

    try {
        /**
         * Add token to blacklist so even if it hasn't expired yet, it will be rejected
         * by the authMiddleware on every subsequent request.
         * The blacklist document auto-expires after 3 days (matching JWT expiry)
         * via the TTL index on blacklistedAt in blacklist.model.js.
         */
        await tokenBlacklistModel.create({ token });
    } catch (err) {
        // If the token is already blacklisted (duplicate), that's fine — still log out cleanly.
        // err.code === 11000 = native MongoDB duplicate key error
        // err.name === 'MongoServerError' with code 11000 is the most common path
        // But Mongoose's unique validator can also throw a ValidationError, so we also
        // check for that to be safe.
        const isDuplicate = err.code === 11000 || err.message?.includes('already blacklisted');
        if (!isDuplicate) {
            return res.status(500).json({ message: "Logout failed", error: err.message });
        }
    }

    res.clearCookie("jwt_token");
    return res.status(200).json({ message: "User logged out successfully" });
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}