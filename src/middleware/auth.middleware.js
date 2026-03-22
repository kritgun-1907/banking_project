const UserModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { tokenBlacklistModel } = require("../models/blacklist.model");

async function authMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // Extract the token from cookies or Authorization header and .split the header to get the token part if it exists.

    if (!token) {
        return res.status(401).json({ message: "Authentication token is missing" }); // If no token is found, return a 401 Unauthorized response with a message indicating that the authentication token is missing.
    }

    const isBlacklisted = await tokenBlacklistModel.findOne({ token }); // Check if the token is blacklisted by querying the tokenBlacklistModel for a document that matches the provided token.
    
    if (isBlacklisted) {
        return res.status(401).json({ message: "Token has been blacklisted. Please log in again." }); // If a document is found in the blacklist, return a 401 Unauthorized response with a message indicating that the token has been blacklisted and the user needs to log in again.
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the secret key defined in environment variables. If the token is valid, it will decode the payload and store it in the decoded variable.
        // basically it will decode the token and give us the payload that we originally signed when creating the token. In our case, the payload contains the userId and email of the authenticated user. We can then use this information to find the corresponding user in the database and attach it to the request object for use in subsequent middleware or route handlers.
        const user = await UserModel.findById(decoded.userId); // Use the userId from the decoded token to find the corresponding user in the database.

        if (!user) {
            return res.status(401).json({ message: "User not found" }); // If no user is found with the provided userId, return a 401 Unauthorized response with a message indicating that the user was not found.
        }

        req.user = user; // Attach the user object to the request object for use in subsequent middleware or route handlers.
        next(); // Call next() to pass control to the next middleware function or route handler in the stack.
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid authentication token" }); // If the token is invalid or expired, return a 401 Unauthorized response with a message indicating that the authentication token is invalid.
    }
}

async function adminMiddleware(req, res, next) {

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // Extract the token from cookies or Authorization header and .split the header to get the token part if it exists.

    if (!token) {
        return res.status(401).json({ message: "Authentication token is missing" }); // If no token is found, return a 401 Unauthorized response with a message indicating that the authentication token is missing.
    }
    
    const isBlacklisted = await tokenBlacklistModel.findOne({ token }); // Check if the token is blacklisted by querying the tokenBlacklistModel for a document that matches the provided token.
    
    if (isBlacklisted) {
        return res.status(401).json({ message: "Token has been blacklisted. Please log in again." }); // If a document is found in the blacklist, return a 401 Unauthorized response with a message indicating that the token has been blacklisted and the user needs to log in again.
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the secret key defined in environment variables. If the token is valid, it will decode the payload and store it in the decoded variable.
        const user = await UserModel.findById(decoded.userId).select("+systemUser"); // Use the userId from the decoded token to find the corresponding user in the database.

        if (!user) {
            return res.status(401).json({ message: "User not found" }); // If no user is found with the provided userId, return a 401 Unauthorized response with a message indicating that the user was not found.
        }

        if (!user.systemUser) {
            return res.status(403).json({ message: "Access only for system User" }); // If the user is not a system user, return a 403 Forbidden response with a message indicating that access is denied.
        }

        req.user = user; // Attach the user object to the request object for use in subsequent middleware or route handlers.
        next(); // Call next() to pass control to the next middleware function or route handler in the stack.
    } catch (err) {
        return res.status(401).json({ message: "Invalid authentication token" }); // If the token is invalid or expired, return a 401 Unauthorized response with a message indicating that the authentication token is invalid.
    }
}



module.exports = {
    authMiddleware,
    adminMiddleware
}