const express = require("express");
const mongoose = require("mongoose");
const { protect, authorizeRoles } = require("../middleware/auth");
const {
    getRewardBalance,
    getRewardHistory,
    redeemRewardPoints,
    maxPointsPerOperation
} = require("../services/rewardService");
const { pointsPerRedemptionUnit } = require("../config/rewards");

const router = express.Router();
router.use(protect, authorizeRoles("DONOR"));

function authenticatedUserId(req, res) {
    const id = req.user.id || req.user._id || req.user.userId;
    if (!mongoose.isValidObjectId(id)) {
        res.status(401).json({ message: "Authenticated user ID is missing or invalid." });
        return null;
    }
    return id;
}

function positiveIntegerQuery(value, fallback, name, maximum) {
    if (value === undefined) return { value: fallback };
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0 || number > maximum) {
        return { error: `${name} must be an integer between 1 and ${maximum}.` };
    }
    return { value: number };
}

function sendError(res, error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
    }
    console.error("REWARD API ERROR:", error);
    return res.status(500).json({ message: "Server error" });
}

router.get("/balance", async (req, res) => {
    const userId = authenticatedUserId(req, res);
    if (!userId) return;
    try {
        const points = await getRewardBalance(userId);
        return res.json({ points });
    } catch (error) {
        return sendError(res, error);
    }
});

router.get("/history", async (req, res) => {
    const userId = authenticatedUserId(req, res);
    if (!userId) return;
    const page = positiveIntegerQuery(req.query.page, 1, "page", Number.MAX_SAFE_INTEGER);
    const limit = positiveIntegerQuery(req.query.limit, 20, "limit", 100);
    if (page.error || limit.error) return res.status(400).json({ message: page.error || limit.error });

    let type;
    if (req.query.type !== undefined) {
        type = String(req.query.type).toUpperCase();
        if (!["EARN", "REDEEM", "ADMIN_ADJUSTMENT"].includes(type)) {
            return res.status(400).json({ message: "Invalid reward transaction type." });
        }
    }
    try {
        const result = await getRewardHistory(userId, { page: page.value, limit: limit.value, type });
        return res.json(result);
    } catch (error) {
        return sendError(res, error);
    }
});

router.post("/redeem", async (req, res) => {
    const userId = authenticatedUserId(req, res);
    if (!userId) return;
    const idempotencyKey = req.get("Idempotency-Key");
    const points = req.body?.points;
    if (!Number.isSafeInteger(points) || points <= 0 || points > maxPointsPerOperation) {
        return res.status(400).json({
            message: `Points must be a positive integer no greater than ${maxPointsPerOperation}.`
        });
    }
    try {
        const result = await redeemRewardPoints(userId, points, idempotencyKey);
        return res.json({
            message: "Reward points redeemed successfully",
            points: result.points,
            redemptionUnits: result.redemptionUnits,
            pointsPerRedemptionUnit,
            transaction: result.reward,
            replayed: result.replayed
        });
    } catch (error) {
        return sendError(res, error);
    }
});

module.exports = router;
