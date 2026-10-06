const mongoose = require("mongoose");
const User = require("../models/User");
const Medicine = require("../models/Medicine");
const Reward = require("../models/Reward");
const { calculateDonationReward } = require("../utils/rewardCalculator");
const { maxPointsPerOperation, pointsPerRedemptionUnit } = require("../config/rewards");

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isTransactionUnavailable(error) {
    return error.code === 20 || error.codeName === "IllegalOperation" ||
        /transaction numbers are only allowed|does not support transactions/i.test(error.message || "");
}

async function inTransaction(operation) {
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await operation(session);
        });
        return result;
    } catch (error) {
        if (isTransactionUnavailable(error)) {
            throw httpError(503, "Reward updates require MongoDB transactions; configure MongoDB as a replica set.");
        }
        throw error;
    } finally {
        await session.endSession();
    }
}

async function awardDonationRewardInSession(medicineId, session) {
    const medicine = await Medicine.findById(medicineId).session(session);
    if (!medicine) throw httpError(404, "Medicine not found");
    if (medicine.status === "EXPIRED" || medicine.expiryDate <= new Date()) {
        throw httpError(400, "Expired donations cannot be approved for rewards.");
    }
    if (medicine.sourceType !== "DONOR") {
        return { awarded: false, alreadyAwarded: false, reason: "Only donor contributions earn reward points." };
    }
    if (medicine.verificationStatus !== "VERIFIED") {
        throw httpError(400, "Medicine must be verified before reward points can be awarded.");
    }

    const existingReward = await Reward.findOne({
        medicine: medicine._id,
        type: "EARN",
        status: "COMPLETED"
    }).session(session);
    if (existingReward) {
        return {
            awarded: false,
            alreadyAwarded: true,
            points: existingReward.points,
            balanceAfter: existingReward.balanceAfter,
            reward: existingReward
        };
    }

    const points = calculateDonationReward(medicine);
    const donor = await User.findOneAndUpdate(
        { _id: medicine.sourceId },
        { $inc: { rewardPoints: points } },
        { returnDocument: "after", session }
    );
    if (!donor) throw httpError(404, "Medicine donor not found");

    const [reward] = await Reward.create([{
        user: donor._id,
        type: "EARN",
        points,
        balanceAfter: donor.rewardPoints,
        reason: "Verified medicine donation",
        medicine: medicine._id,
        status: "COMPLETED"
    }], { session });

    return { awarded: true, alreadyAwarded: false, points, balanceAfter: donor.rewardPoints, reward };
}

async function awardDonationReward(medicineId, options = {}) {
    if (!mongoose.isValidObjectId(medicineId)) throw httpError(400, "Invalid medicine ID");
    if (options.session) return awardDonationRewardInSession(medicineId, options.session);

    try {
        return await inTransaction(session => awardDonationRewardInSession(medicineId, session));
    } catch (error) {
        // The unique index is the final guard for concurrent verification calls.
        if (error.code === 11000) {
            const existing = await Reward.findOne({ medicine: medicineId, type: "EARN", status: "COMPLETED" });
            if (existing) {
                return {
                    awarded: false,
                    alreadyAwarded: true,
                    points: existing.points,
                    balanceAfter: existing.balanceAfter,
                    reward: existing
                };
            }
        }
        throw error;
    }
}

async function getRewardBalance(userId) {
    const user = await User.findById(userId).select("rewardPoints");
    if (!user) throw httpError(404, "User not found");
    return Number.isSafeInteger(user.rewardPoints) && user.rewardPoints >= 0 ? user.rewardPoints : 0;
}

async function getRewardHistory(userId, { page = 1, limit = 20, type } = {}) {
    const filter = { user: userId };
    if (type) filter.type = type;
    const [transactions, count] = await Promise.all([
        Reward.find(filter)
            .populate("medicine", "name manufacturer quantity expiryDate")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Reward.countDocuments(filter)
    ]);
    return { transactions, count, page, limit };
}

async function redemptionResult(userId, points, idempotencyKey, session) {
    const existingReward = await Reward.findOne({ user: userId, type: "REDEEM", idempotencyKey }).session(session);
    if (existingReward) {
        if (existingReward.points !== -points) throw httpError(409, "Idempotency key was already used for a different redemption.");
        return {
            reward: existingReward,
            points: existingReward.balanceAfter,
            redemptionUnits: points / pointsPerRedemptionUnit,
            replayed: true
        };
    }

    const user = await User.findOneAndUpdate(
        { _id: userId, rewardPoints: { $gte: points } },
        { $inc: { rewardPoints: -points } },
        { returnDocument: "after", session }
    );
    if (!user) {
        const exists = await User.exists({ _id: userId }).session(session);
        if (!exists) throw httpError(404, "User not found");
        throw httpError(400, "Insufficient reward points");
    }

    const [reward] = await Reward.create([{
        user: user._id,
        type: "REDEEM",
        points: -points,
        balanceAfter: user.rewardPoints,
        reason: "Reward points redemption",
        idempotencyKey,
        status: "COMPLETED"
    }], { session });
    return { reward, points: user.rewardPoints, redemptionUnits: points / pointsPerRedemptionUnit, replayed: false };
}

async function redeemRewardPoints(userId, points, idempotencyKey) {
    if (!Number.isSafeInteger(points) || points <= 0 || points > maxPointsPerOperation) {
        throw httpError(400, `Points must be a positive integer no greater than ${maxPointsPerOperation}.`);
    }
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
        throw httpError(400, "A valid Idempotency-Key header is required.");
    }
    try {
        return await inTransaction(session => redemptionResult(userId, points, idempotencyKey, session));
    } catch (error) {
        if (error.code === 11000) {
            const existingReward = await Reward.findOne({ user: userId, type: "REDEEM", idempotencyKey });
            if (existingReward) {
                if (existingReward.points !== -points) throw httpError(409, "Idempotency key was already used for a different redemption.");
                return {
                    reward: existingReward,
                    points: existingReward.balanceAfter,
                    redemptionUnits: points / pointsPerRedemptionUnit,
                    replayed: true
                };
            }
        }
        throw error;
    }
}

async function adjustRewardPoints(userId, points, reason) {
    if (!mongoose.isValidObjectId(userId)) throw httpError(400, "A valid userId is required");
    if (!Number.isSafeInteger(points) || points === 0 || Math.abs(points) > maxPointsPerOperation) {
        throw httpError(400, `Adjustment points must be a non-zero integer between -${maxPointsPerOperation} and ${maxPointsPerOperation}.`);
    }
    if (typeof reason !== "string" || !reason.trim()) throw httpError(400, "Adjustment reason is required");
    if (reason.trim().length > 500) throw httpError(400, "Adjustment reason cannot exceed 500 characters");

    return inTransaction(async session => {
        const filter = { _id: userId };
        if (points < 0) filter.rewardPoints = { $gte: Math.abs(points) };
        const user = await User.findOneAndUpdate(
            filter,
            { $inc: { rewardPoints: points } },
            { returnDocument: "after", session }
        );
        if (!user) {
            const exists = await User.exists({ _id: userId }).session(session);
            if (!exists) throw httpError(404, "User not found");
            throw httpError(400, "Adjustment would make the reward balance negative");
        }

        const [reward] = await Reward.create([{
            user: user._id,
            type: "ADMIN_ADJUSTMENT",
            points,
            balanceAfter: user.rewardPoints,
            reason: reason.trim(),
            status: "COMPLETED"
        }], { session });
        return { reward, points: user.rewardPoints };
    });
}

async function getAdminRewardHistory(filter, { page = 1, limit = 20 } = {}) {
    const [transactions, count] = await Promise.all([
        Reward.find(filter)
            .populate("user", "name email role")
            .populate("medicine", "name manufacturer quantity expiryDate")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Reward.countDocuments(filter)
    ]);
    return { transactions, count, page, limit };
}

module.exports = {
    awardDonationReward,
    redeemRewardPoints,
    adjustRewardPoints,
    getRewardBalance,
    getRewardHistory,
    getAdminRewardHistory,
    httpError,
    maxPointsPerOperation
};
