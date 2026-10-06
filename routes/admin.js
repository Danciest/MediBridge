const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Medicine = require("../models/Medicine");
const Request = require("../models/Request");
const Reward = require("../models/Reward");
const IssueReport = require("../models/IssueReport");
const { protect, authorizeRoles } = require("../middleware/auth");
const { awardDonationReward } = require("../services/rewardService");

const router = express.Router();
router.use(protect, authorizeRoles("ADMIN"));
const roles = ["DONOR", "PHARMACY", "NGO", "HOSPITAL", "ADMIN"];
const reportStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
const requestStatuses = ["PENDING", "MATCHED", "ACCEPTED", "FULFILLING", "COMPLETED", "CANCELLED"];
const medicineStatuses = ["AVAILABLE", "REQUESTED", "ALLOCATED", "EXPIRED", "CLAIMED"];

function pageOptions(query) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isSafeInteger(page) || page < 1) return { error: "page must be a positive integer." };
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return { error: "limit must be between 1 and 100." };
    return { page, limit, skip: (page - 1) * limit };
}
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function sendError(res, error, label) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (["ValidationError", "CastError"].includes(error.name)) return res.status(400).json({ message: error.message });
    console.error(`${label}:`, error);
    return res.status(500).json({ message: "Server error" });
}
function dateRange(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    const start = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== value) return null;
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    return { $gte: start, $lt: end };
}
function invalidId(value) { return !mongoose.isValidObjectId(value); }

// Safe user administration; auth fields and reward balances are deliberately excluded.
router.get("/users", async (req, res) => {
    const page = pageOptions(req.query); if (page.error) return res.status(400).json({ message: page.error });
    const filter = {};
    if (req.query.role) {
        const role = String(req.query.role).toUpperCase();
        if (!roles.includes(role)) return res.status(400).json({ message: "Invalid role filter." });
        filter.role = role;
    }
    if (req.query.active !== undefined) {
        if (!["true", "false"].includes(String(req.query.active).toLowerCase())) return res.status(400).json({ message: "active must be true or false." });
        filter.active = String(req.query.active).toLowerCase() === "true" ? { $ne: false } : false;
    }
    if (req.query.search) {
        const search = new RegExp(escapeRegex(String(req.query.search).trim().slice(0, 100)), "i");
        filter.$or = [{ name: search }, { email: search }];
    }
    try {
        const [users, count] = await Promise.all([
            User.find(filter).select("name email role active createdAt rewardPoints city").sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean(),
            User.countDocuments(filter)
        ]);
        return res.json({ users, count, page: page.page, limit: page.limit });
    } catch (error) { return sendError(res, error, "ADMIN USERS LIST ERROR"); }
});

router.get("/users/:id", async (req, res) => {
    if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
    try {
        const user = await User.findById(req.params.id).select("name email role active createdAt updatedAt rewardPoints phone city address isVerified").lean();
        if (!user) return res.status(404).json({ message: "User not found." });
        const [donations, requests, rewardTransactions] = await Promise.all([
            Medicine.countDocuments({ sourceId: user._id }),
            Request.countDocuments({ requester: user._id }),
            Reward.countDocuments({ user: user._id })
        ]);
        return res.json({ user, activity: { donations, requests, rewardTransactions } });
    } catch (error) { return sendError(res, error, "ADMIN USER DETAIL ERROR"); }
});

router.patch("/users/:id", async (req, res) => {
    if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
    const body = req.body || {};
    const keys = Object.keys(body);
    if (!keys.length || keys.some(key => !["role", "active"].includes(key))) return res.status(400).json({ message: "Only role and active can be changed." });
    if (body.role !== undefined && (typeof body.role !== "string" || !roles.includes(body.role.toUpperCase()))) return res.status(400).json({ message: "Invalid role." });
    if (body.active !== undefined && typeof body.active !== "boolean") return res.status(400).json({ message: "active must be a boolean." });
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        const nextRole = body.role === undefined ? user.role : body.role.toUpperCase();
        const nextActive = body.active === undefined ? user.active !== false : body.active;
        const removesAdmin = user.role === "ADMIN" && user.active !== false && (nextRole !== "ADMIN" || !nextActive);
        if (removesAdmin) {
            const remaining = await User.countDocuments({ role: "ADMIN", active: { $ne: false }, _id: { $ne: user._id } });
            if (!remaining) return res.status(409).json({ message: "Cannot disable or demote the only active admin." });
        }
        if (String(user._id) === String(req.user.id || req.user._id) && (!nextActive || nextRole !== "ADMIN")) {
            return res.status(409).json({ message: "You cannot disable or demote your own admin account." });
        }
        user.role = nextRole; user.active = nextActive;
        await user.save();
        return res.json({ message: "User updated", user: await User.findById(user._id).select("name email role active createdAt rewardPoints city").lean() });
    } catch (error) { return sendError(res, error, "ADMIN USER UPDATE ERROR"); }
});

router.get("/medicines", async (req, res) => {
    const page = pageOptions(req.query); if (page.error) return res.status(400).json({ message: page.error });
    const filter = {};
    if (req.query.status) { const status = String(req.query.status).toUpperCase(); if (!medicineStatuses.includes(status)) return res.status(400).json({ message: "Invalid medicine status." }); filter.status = status; }
    if (req.query.verificationStatus) { const status = String(req.query.verificationStatus).toUpperCase(); if (!["PENDING", "VERIFIED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Invalid verification status." }); filter.verificationStatus = status; }
    if (req.query.donor) { if (invalidId(req.query.donor)) return res.status(400).json({ message: "Invalid donor ID." }); filter.sourceId = req.query.donor; }
    if (req.query.name) filter.name = new RegExp(escapeRegex(req.query.name), "i");
    if (req.query.date) { const range = dateRange(req.query.date); if (!range) return res.status(400).json({ message: "date must be YYYY-MM-DD." }); filter.createdAt = range; }
    if (req.query.expiryBefore) { const date = dateRange(req.query.expiryBefore); if (!date) return res.status(400).json({ message: "expiryBefore must be YYYY-MM-DD." }); filter.expiryDate = { $lt: date.$lt }; }
    try {
        const [medicines, count] = await Promise.all([
            Medicine.find(filter).populate("sourceId", "name email role").sort({ createdAt: -1 }).skip(page.skip).limit(page.limit),
            Medicine.countDocuments(filter)
        ]);
        return res.json({ medicines, count, page: page.page, limit: page.limit });
    } catch (error) { return sendError(res, error, "ADMIN MEDICINES LIST ERROR"); }
});

router.get("/medicines/:id", async (req, res) => {
    if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid medicine ID." });
    try {
        const medicine = await Medicine.findById(req.params.id).populate("sourceId", "name email role city");
        if (!medicine) return res.status(404).json({ message: "Medicine not found." });
        const [relatedRequests, rewards] = await Promise.all([
            Request.find({ matchedMedicine: medicine._id }).populate("requester", "name email role").sort({ createdAt: -1 }).limit(50),
            Reward.find({ medicine: medicine._id }).populate("user", "name email role").sort({ createdAt: -1 })
        ]);
        return res.json({ medicine, relatedRequests, rewards });
    } catch (error) { return sendError(res, error, "ADMIN MEDICINE DETAIL ERROR"); }
});

router.patch("/medicines/:id/review", async (req, res) => {
    if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid medicine ID." });
    const action = typeof req.body?.action === "string" ? req.body.action.toUpperCase() : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!["APPROVE", "REJECT"].includes(action)) return res.status(400).json({ message: "action must be APPROVE or REJECT." });
    if (action === "REJECT" && (reason.length < 5 || reason.length > 500)) return res.status(400).json({ message: "A rejection reason between 5 and 500 characters is required." });
    try {
        if (action === "REJECT") {
            const medicine = await Medicine.findOneAndUpdate({ _id: req.params.id, verificationStatus: "PENDING" }, { $set: { verificationStatus: "REJECTED", reviewReason: reason } }, { returnDocument: "after", runValidators: true }).populate("sourceId", "name email role");
            if (!medicine) {
                const exists = await Medicine.exists({ _id: req.params.id });
                return exists ? res.status(409).json({ message: "Donation has already been reviewed." }) : res.status(404).json({ message: "Medicine not found." });
            }
            return res.json({ message: "Donation rejected", medicine });
        }
        const session = await mongoose.startSession();
        let reviewResult;
        try {
            await session.withTransaction(async () => {
                const medicine = await Medicine.findOneAndUpdate({ _id: req.params.id, verificationStatus: "PENDING" }, { $set: { verificationStatus: "VERIFIED", reviewReason: "" } }, { returnDocument: "after", runValidators: true, session });
                if (!medicine) {
                    const exists = await Medicine.exists({ _id: req.params.id }).session(session);
                    const error = new Error(exists ? "Donation has already been reviewed." : "Medicine not found."); error.statusCode = exists ? 409 : 404; throw error;
                }
                const reward = await awardDonationReward(medicine._id, { session });
                reviewResult = { medicineId: medicine._id, reward };
            });
            const medicine = await Medicine.findById(reviewResult.medicineId).populate("sourceId", "name email role");
            return res.json({ message: "Donation approved", medicine, reward: reviewResult.reward });
        } catch (error) {
            if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
            if (error.code === 20 || error.codeName === "IllegalOperation" || /transaction numbers are only allowed|does not support transactions/i.test(error.message || "")) return res.status(503).json({ message: "Donation approval with rewards requires MongoDB transactions; configure MongoDB as a replica set." });
            return sendError(res, error, "ADMIN MEDICINE APPROVAL ERROR");
        } finally { await session.endSession(); }
    } catch (error) { return sendError(res, error, "ADMIN MEDICINE REVIEW ERROR"); }
});

router.get("/requests", async (req, res) => {
    const page = pageOptions(req.query); if (page.error) return res.status(400).json({ message: page.error });
    const filter = {};
    if (req.query.status) { const status = String(req.query.status).toUpperCase(); if (!requestStatuses.includes(status)) return res.status(400).json({ message: "Invalid request status." }); filter.status = status; }
    if (req.query.requester) { if (invalidId(req.query.requester)) return res.status(400).json({ message: "Invalid requester ID." }); filter.requester = req.query.requester; }
    if (req.query.medicine) filter.medicineName = new RegExp(escapeRegex(req.query.medicine), "i");
    if (req.query.date) { const range = dateRange(req.query.date); if (!range) return res.status(400).json({ message: "date must be YYYY-MM-DD." }); filter.createdAt = range; }
    try {
        const [requests, count] = await Promise.all([
            Request.find(filter).populate("requester", "name email role").populate("matchedMedicine", "name manufacturer quantity").sort({ createdAt: -1 }).skip(page.skip).limit(page.limit),
            Request.countDocuments(filter)
        ]);
        return res.json({ requests, count, page: page.page, limit: page.limit });
    } catch (error) { return sendError(res, error, "ADMIN REQUEST LIST ERROR"); }
});

router.get("/requests/:id", async (req, res) => {
    if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid request ID." });
    try {
        const request = await Request.findById(req.params.id).populate("requester", "name email role").populate("matchedMedicine", "name manufacturer quantity expiryDate status");
        return request ? res.json({ request }) : res.status(404).json({ message: "Request not found." });
    } catch (error) { return sendError(res, error, "ADMIN REQUEST DETAIL ERROR"); }
});

router.get("/reports", async (req, res) => {
    const page = pageOptions(req.query); if (page.error) return res.status(400).json({ message: page.error });
    const filter = {};
    if (req.query.status) { const status = String(req.query.status).toUpperCase(); if (!reportStatuses.includes(status)) return res.status(400).json({ message: "Invalid report status." }); filter.status = status; }
    if (req.query.type) { const type = String(req.query.type).toUpperCase(); if (!["USER", "MEDICINE", "REQUEST", "OTHER"].includes(type)) return res.status(400).json({ message: "Invalid report type." }); filter.type = type; }
    try {
        const [reports, count] = await Promise.all([
            IssueReport.find(filter).populate("reporter", "name email role").populate("relatedUser", "name email role").populate("relatedMedicine", "name status verificationStatus").populate("relatedRequest", "medicineName status").sort({ createdAt: -1 }).skip(page.skip).limit(page.limit),
            IssueReport.countDocuments(filter)
        ]);
        return res.json({ reports, count, page: page.page, limit: page.limit });
    } catch (error) { return sendError(res, error, "ADMIN REPORT LIST ERROR"); }
});

router.get("/reports/:id", async (req, res) => {
    if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid report ID." });
    try {
        const report = await IssueReport.findById(req.params.id).populate("reporter", "name email role").populate("relatedUser", "name email role").populate("relatedMedicine", "name status verificationStatus").populate("relatedRequest", "medicineName status");
        return report ? res.json({ report }) : res.status(404).json({ message: "Report not found." });
    } catch (error) { return sendError(res, error, "ADMIN REPORT DETAIL ERROR"); }
});

router.patch("/reports/:id", async (req, res) => {
    if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid report ID." });
    const body = req.body || {};
    if (!Object.keys(body).length || Object.keys(body).some(key => !["status", "adminNotes"].includes(key))) return res.status(400).json({ message: "Only status and adminNotes can be changed." });
    if (body.status !== undefined && (typeof body.status !== "string" || !reportStatuses.includes(body.status.toUpperCase()))) return res.status(400).json({ message: "Invalid report status." });
    if (body.adminNotes !== undefined && (typeof body.adminNotes !== "string" || body.adminNotes.length > 2000)) return res.status(400).json({ message: "adminNotes must be a string up to 2000 characters." });
    try {
        const update = {};
        if (body.status !== undefined) update.status = body.status.toUpperCase();
        if (body.adminNotes !== undefined) update.adminNotes = body.adminNotes.trim();
        const report = await IssueReport.findByIdAndUpdate(req.params.id, { $set: update }, { returnDocument: "after", runValidators: true }).populate("reporter", "name email role");
        return report ? res.json({ message: "Report updated", report }) : res.status(404).json({ message: "Report not found." });
    } catch (error) { return sendError(res, error, "ADMIN REPORT UPDATE ERROR"); }
});

router.get("/statistics", async (req, res) => {
    try {
        const [userGroups, medicineGroups, requestGroups, available, earned, redeemed] = await Promise.all([
            User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
            Medicine.aggregate([{ $group: { _id: "$verificationStatus", count: { $sum: 1 } } }]),
            Request.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            Medicine.aggregate([{ $match: { status: "AVAILABLE", expiryDate: { $gt: new Date() } } }, { $group: { _id: null, quantity: { $sum: "$quantity" }, count: { $sum: 1 } } }]),
            Reward.aggregate([{ $match: { type: "EARN", status: "COMPLETED" } }, { $group: { _id: null, points: { $sum: "$points" } } }]),
            Reward.aggregate([{ $match: { type: "REDEEM", status: "COMPLETED" } }, { $group: { _id: null, points: { $sum: "$points" } } }])
        ]);
        const byKey = items => Object.fromEntries(items.map(item => [item._id, item.count]));
        const usersByRole = byKey(userGroups), donationsByStatus = byKey(medicineGroups), requestsByStatus = byKey(requestGroups);
        const [totalUsers, totalMedicines, totalRequests] = await Promise.all([User.countDocuments(), Medicine.countDocuments(), Request.countDocuments()]);
        return res.json({
            users: { total: totalUsers, byRole: usersByRole },
            medicines: { total: totalMedicines, byVerificationStatus: donationsByStatus, availableCount: available[0]?.count || 0, availableQuantity: available[0]?.quantity || 0 },
            requests: { total: totalRequests, byStatus: requestsByStatus },
            rewards: { awarded: earned[0]?.points || 0, redeemed: Math.abs(redeemed[0]?.points || 0) }
        });
    } catch (error) { return sendError(res, error, "ADMIN STATISTICS ERROR"); }
});

module.exports = router;
