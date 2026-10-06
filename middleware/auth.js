const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (typeof authHeader !== "string" || !authHeader) {
            return res.status(401).json({
                message: "No token provided"
            });
        }

        // Expected format: Bearer TOKEN
        const match = /^Bearer\s+([^\s]+)$/i.exec(authHeader);
        const token = match?.[1];

        if (!token) {
            return res.status(401).json({
                message: "Invalid authorization format"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!Number.isSafeInteger(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const authenticatedId = decoded.id || decoded._id || decoded.userId;
        if (!mongoose.isValidObjectId(authenticatedId)) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        const account = await User.findById(authenticatedId).select("role active").lean();
        if (!account) return res.status(401).json({ message: "Invalid or expired token" });
        if (account.active === false) return res.status(403).json({ message: "This account has been suspended." });

        // Use the current database role so role changes take effect immediately.
        req.user = { ...decoded, id: String(authenticatedId), role: account.role };

        // Continue to the actual route
        next();

    } catch (error) {
        if (error.name === "MongoServerSelectionError" || error.name === "MongooseServerSelectionError") {
            return res.status(503).json({ message: "Authentication service is temporarily unavailable." });
        }
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

const authorizeRoles = (...allowedRoles) => {
    const roles = allowedRoles.flat();
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Not authorized."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied. You do not have permission to access this resource."
            });
        }

        next();
    };
};

// Preserve the original `require("./middleware/auth")` protect export.
module.exports = protect;
module.exports.protect = protect;
module.exports.authorizeRoles = authorizeRoles;
module.exports.authorize = authorizeRoles;
