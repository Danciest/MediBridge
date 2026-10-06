const express = require("express");
const mongoose = require("mongoose");
const IssueReport = require("../models/IssueReport");
const User = require("../models/User");
const Medicine = require("../models/Medicine");
const Request = require("../models/Request");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.post("/", async (req, res) => {
    const { type, description } = req.body || {};
    const normalizedType = typeof type === "string" ? type.toUpperCase() : "";
    if (!["USER", "MEDICINE", "REQUEST", "OTHER"].includes(normalizedType)) {
        return res.status(400).json({ message: "type must be USER, MEDICINE, REQUEST, or OTHER." });
    }
    if (typeof description !== "string" || description.trim().length < 10 || description.trim().length > 2000) {
        return res.status(400).json({ message: "description must be between 10 and 2000 characters." });
    }
    const relatedFields = { USER: "relatedUser", MEDICINE: "relatedMedicine", REQUEST: "relatedRequest" };
    const relatedField = relatedFields[normalizedType];
    const relatedId = relatedField ? req.body[relatedField] : null;
    const suppliedRelatedFields = ["relatedUser", "relatedMedicine", "relatedRequest"].filter(key => req.body[key] !== undefined);
    if (suppliedRelatedFields.some(key => key !== relatedField)) {
        return res.status(400).json({ message: "Related record must match the report type." });
    }
    if (relatedField && !mongoose.isValidObjectId(relatedId)) {
        return res.status(400).json({ message: `${relatedField} is required and must be a valid ID.` });
    }
    if (!relatedField && ["relatedUser", "relatedMedicine", "relatedRequest"].some(key => req.body[key])) {
        return res.status(400).json({ message: "Related records must match the report type." });
    }
    try {
        if (relatedField) {
            const Model = { relatedUser: User, relatedMedicine: Medicine, relatedRequest: Request }[relatedField];
            if (!await Model.exists({ _id: relatedId })) return res.status(404).json({ message: "Related record not found." });
        }
        const report = await IssueReport.create({
            reporter: req.user.id || req.user._id,
            type: normalizedType,
            description: description.trim(),
            ...(relatedField ? { [relatedField]: relatedId } : {})
        });
        return res.status(201).json({ message: "Report submitted", report });
    } catch (error) {
        if (["ValidationError", "CastError"].includes(error.name)) return res.status(400).json({ message: error.message });
        console.error("CREATE REPORT ERROR:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

router.get("/my", async (req, res) => {
    try {
        const reports = await IssueReport.find({ reporter: req.user.id || req.user._id }).sort({ createdAt: -1 }).limit(100);
        return res.json({ reports, count: reports.length });
    } catch (error) {
        console.error("LIST MY REPORTS ERROR:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
