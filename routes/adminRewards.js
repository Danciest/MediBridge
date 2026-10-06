const express = require("express");
const mongoose = require("mongoose");
const { protect, authorizeRoles } = require("../middleware/auth");
const { getAdminRewardHistory, adjustRewardPoints } = require("../services/rewardService");

const router = express.Router();
const transactionTypes = ["EARN", "REDEEM", "ADMIN_ADJUSTMENT"];
const transactionStatuses = ["PENDING", "COMPLETED", "CANCELLED"];
router.use(protect, authorizeRoles("ADMIN"));

function pagination(query) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isSafeInteger(page) || page < 1) return { error: "page must be a positive integer." };
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        return { error: "limit must be an integer between 1 and 100." };
    }
    return { page, limit };
}

function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const start = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== value) return null;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}

function sendError(res, error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
    }
    console.error("ADMIN REWARD API ERROR:", error);
    return res.status(500).json({ message: "Server error" });
}

router.get("/", async (req, res) => {
    const page = pagination(req.query);
    if (page.error) return res.status(400).json({ message: page.error });

    const filter = {};
    if (req.query.user !== undefined) {
        if (!mongoose.isValidObjectId(req.query.user)) return res.status(400).json({ message: "Invalid user filter." });
        filter.user = req.query.user;
    }
    if (req.query.type !== undefined) {
        const type = String(req.query.type).toUpperCase();
        if (!transactionTypes.includes(type)) return res.status(400).json({ message: "Invalid reward transaction type filter." });
        filter.type = type;
    }
    if (req.query.status !== undefined) {
        const status = String(req.query.status).toUpperCase();
        if (!transactionStatuses.includes(status)) return res.status(400).json({ message: "Invalid reward transaction status filter." });
        filter.status = status;
    }
    if (req.query.date !== undefined) {
        const range = parseDate(req.query.date);
        if (!range) return res.status(400).json({ message: "date must be a real date in YYYY-MM-DD format." });
        filter.createdAt = { $gte: range.start, $lt: range.end };
    }

    try {
        const result = await getAdminRewardHistory(filter, page);
        return res.json(result);
    } catch (error) {
        return sendError(res, error);
    }
});

router.post("/adjust", async (req, res) => {
    const { userId, points, reason } = req.body || {};
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "A valid userId is required." });
    if (!Number.isSafeInteger(points) || points === 0) {
        return res.status(400).json({ message: "Adjustment points must be a non-zero integer." });
    }
    if (typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({ message: "Adjustment reason is required." });
    }
    try {
        const result = await adjustRewardPoints(userId, points, reason);
        return res.json({
            message: "Reward points adjusted successfully",
            points: result.points,
            transaction: result.reward
        });
    } catch (error) {
        return sendError(res, error);
    }
});

module.exports = router;
