const express = require("express");
const mongoose = require("mongoose");
const Medicine = require("../models/Medicine");
const User = require("../models/User");
const { protect, authorizeRoles } = require("../middleware/auth");
const { awardDonationReward } = require("../services/rewardService");

const router = express.Router();
const readableRoles = ["DONOR", "PHARMACY", "NGO", "HOSPITAL", "ADMIN"];
const editableFields = [
    "name",
    "manufacturer",
    "genericName",
    "category",
    "quantity",
    "unit",
    "batchNumber",
    "expiryDate",
    "location"
];
const adminFields = ["status", "verificationStatus", "sourceId", "sourceType"];
const statusValues = ["AVAILABLE", "REQUESTED", "ALLOCATED", "EXPIRED"];
const verificationValues = ["PENDING", "VERIFIED", "REJECTED"];

router.use(protect);

function userId(req) {
    return req.user.id || req.user._id;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDay(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
        ? null
        : date;
}

function currentDateStart() {
    const parts = new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const dateParts = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return parseDay(`${dateParts.year}-${dateParts.month}-${dateParts.day}`);
}

function pickFields(source, fields) {
    return fields.reduce((result, field) => {
        if (source[field] !== undefined) result[field] = source[field];
        return result;
    }, {});
}

function validateMedicineInput(fields) {
    if (fields.quantity !== undefined && (!Number.isSafeInteger(Number(fields.quantity)) || Number(fields.quantity) <= 0 || Number(fields.quantity) > 1000000)) {
        return "Quantity must be a whole number between 1 and 1000000.";
    }
    if (fields.expiryDate !== undefined && !parseDay(String(fields.expiryDate))) {
        return "expiryDate must be a real calendar date in YYYY-MM-DD format.";
    }
    return null;
}
function buildFilters(req, filters) {
    const { search, name, manufacturer, city, location, status, expiryDate, expiryAfter, expiryBefore } = req.query;

    const medicineName = search || name;
    if (medicineName) filters.name = new RegExp(escapeRegExp(String(medicineName).trim()), "i");
    if (manufacturer) {
        filters.manufacturer = new RegExp(escapeRegExp(String(manufacturer).trim()), "i");
    }
    if (city) filters["location.city"] = new RegExp(escapeRegExp(String(city).trim()), "i");
    if (location) {
        const expression = new RegExp(escapeRegExp(String(location).trim()), "i");
        filters.$or = [
            { "location.city": expression },
            { "location.address": expression }
        ];
    }

    if (status) {
        const normalizedStatus = String(status).toUpperCase();
        if (!statusValues.includes(normalizedStatus)) {
            return "Invalid status filter";
        }
        filters.status = normalizedStatus;
    }

    const dateFilter = {};
    if (expiryDate) {
        const start = parseDay(String(expiryDate));
        if (!start) return "expiryDate must use YYYY-MM-DD";
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        dateFilter.$gte = start;
        dateFilter.$lt = end;
    }
    if (expiryAfter) {
        const after = parseDay(String(expiryAfter));
        if (!after) return "expiryAfter must use YYYY-MM-DD";
        dateFilter.$gte = after;
    }
    if (expiryBefore) {
        const before = parseDay(String(expiryBefore));
        if (!before) return "expiryBefore must use YYYY-MM-DD";
        const end = new Date(before);
        end.setUTCDate(end.getUTCDate() + 1);
        dateFilter.$lt = end;
    }
    if (Object.keys(dateFilter).length) filters.expiryDate = dateFilter;

    return null;
}

function isOwner(medicine, req) {
    return medicine.sourceType === "DONOR" && String(medicine.sourceId) === String(userId(req));
}

function canReadMedicine(medicine, req) {
    if (req.user.role === "ADMIN") return true;
    if (req.user.role === "DONOR") return isOwner(medicine, req);
    return medicine.status === "AVAILABLE";
}

router.post(
    "/",
    authorizeRoles("DONOR", "PHARMACY"),
    async (req, res) => {
        try {
            const body = req.body || {};
            const pickupLocation = body.pickupLocation;
            const legacyLocation = body.location;
            let location;

            if (pickupLocation !== undefined) {
                if (typeof pickupLocation !== "string" || !pickupLocation.trim()) {
                    return res.status(400).json({ message: "pickupLocation must be a non-empty string." });
                }
                location = { address: pickupLocation.trim() };
            } else if (legacyLocation && typeof legacyLocation === "object" && !Array.isArray(legacyLocation)) {
                const city = typeof legacyLocation.city === "string" ? legacyLocation.city.trim() : "";
                const address = typeof legacyLocation.address === "string" ? legacyLocation.address.trim() : "";
                if (!city && !address) {
                    return res.status(400).json({ message: "pickupLocation is required." });
                }
                location = { ...(city ? { city } : {}), ...(address ? { address } : {}) };
            } else {
                return res.status(400).json({ message: "pickupLocation is required." });
            }

            const medicineName = body.medicineName !== undefined ? body.medicineName : body.name;
            const fields = {
                name: typeof medicineName === "string" ? medicineName.trim() : medicineName,
                manufacturer: typeof body.manufacturer === "string" ? body.manufacturer.trim() : body.manufacturer,
                quantity: body.quantity,
                batchNumber: typeof body.batchNumber === "string" ? body.batchNumber.trim() : body.batchNumber,
                expiryDate: body.expiryDate,
                location
            };
            const inputError = validateMedicineInput(fields);
            if (inputError) return res.status(400).json({ message: inputError });
            if (typeof fields.name !== "string" || !fields.name.trim()) {
                return res.status(400).json({ message: "medicineName is required." });
            }
            if (typeof fields.manufacturer !== "string" || !fields.manufacturer.trim()) {
                return res.status(400).json({ message: "Manufacturer is required." });
            }
            if (typeof fields.batchNumber !== "string" || !fields.batchNumber.trim()) {
                return res.status(400).json({ message: "Batch number is required." });
            }
            if (fields.expiryDate === undefined) {
                return res.status(400).json({ message: "Expiry date is required." });
            }
            const expiryDate = parseDay(String(fields.expiryDate));
            if (expiryDate <= currentDateStart()) {
                return res.status(400).json({
                    message: "Medicine has already expired or expires today."
                });
            }
            fields.expiryDate = expiryDate;

            if (fields.quantity === undefined || fields.quantity === null || fields.quantity === "") {
                return res.status(400).json({ message: "Quantity is required." });
            }
            fields.quantity = Number(fields.quantity);

            const authenticatedUserId = userId(req);
            if (!mongoose.isValidObjectId(authenticatedUserId)) {
                return res.status(401).json({ message: "Authenticated user ID is missing or invalid." });
            }

            const donorOrPharmacy = await User.findOne({ _id: authenticatedUserId, role: req.user.role });
            if (!donorOrPharmacy) {
                return res.status(400).json({ message: "Authenticated donor or pharmacy account was not found." });
            }

            fields.sourceId = donorOrPharmacy._id;
            fields.sourceType = donorOrPharmacy.role;
            fields.status = "AVAILABLE";
            fields.verificationStatus = "PENDING";

            const medicine = await Medicine.create(fields);
            return res.status(201).json({ medicine });
        } catch (error) {
            if (error.name === "ValidationError" || error.name === "CastError") {
                return res.status(400).json({ message: error.message });
            }
            console.error("CREATE MEDICINE ERROR:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
);

// Donor and pharmacy history includes pending/reviewed donations, unlike the public available inventory.
router.get("/my", authorizeRoles("DONOR", "PHARMACY"), async (req, res) => {
    try {
        const filters = { sourceId: userId(req), sourceType: req.user.role };
        const filterError = buildFilters(req, filters);
        if (filterError) return res.status(400).json({ message: filterError });
        const medicines = await Medicine.find(filters).sort({ createdAt: -1 }).limit(100);
        return res.json({ medicines, count: medicines.length });
    } catch (error) {
        console.error("LIST MY MEDICINES ERROR:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

router.get(
    "/",
    authorizeRoles(...readableRoles),
    async (req, res) => {
        try {
            const filters = {};
            const filterError = buildFilters(req, filters);
            if (filterError) return res.status(400).json({ message: filterError });

            const today = currentDateStart();
            await Medicine.updateMany(
                { status: "AVAILABLE", expiryDate: { $lte: today } },
                { $set: { status: "EXPIRED" } }
            );

            // Query filters can narrow results, but cannot weaken availability/expiry rules.
            const requestedExpiryFilter = filters.expiryDate;
            delete filters.status;
            delete filters.expiryDate;
            filters.status = "AVAILABLE";
            filters.expiryDate = { $gt: today };
            if (requestedExpiryFilter) {
                filters.$and = [...(filters.$and || []), { expiryDate: requestedExpiryFilter }];
            }

            if (req.user.role === "DONOR") {
                filters.sourceId = userId(req);
                filters.sourceType = "DONOR";
            } else if (["PHARMACY", "NGO", "HOSPITAL"].includes(req.user.role)) {
                // These roles may browse inventory available for requests only.
            }

            const medicines = await Medicine.find(filters)
                .populate("sourceId", "name email")
                .sort({ createdAt: -1 });
            return res.json({ medicines, count: medicines.length });
        } catch (error) {
            console.error("LIST MEDICINES ERROR:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
);

router.get(
    "/:id",
    authorizeRoles(...readableRoles),
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid medicine ID" });
        }
        try {
            const medicine = await Medicine.findById(req.params.id);
            if (!medicine || !canReadMedicine(medicine, req)) {
                return res.status(404).json({ message: "Medicine not found" });
            }
            return res.json({ medicine });
        } catch (error) {
            console.error("GET MEDICINE ERROR:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
);

router.put(
    "/:id",
    authorizeRoles("ADMIN"),
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid medicine ID" });
        }
        try {
            const fields = {
                ...pickFields(req.body || {}, editableFields),
                ...pickFields(req.body || {}, adminFields)
            };
            const inputError = validateMedicineInput({ ...fields, ...pickFields(req.body || {}, ["quantity", "expiryDate"]) });
            if (inputError) return res.status(400).json({ message: inputError });
            if (fields.status !== undefined && !statusValues.includes(fields.status)) {
                return res.status(400).json({ message: "Invalid medicine status." });
            }
            if (fields.verificationStatus !== undefined && !verificationValues.includes(fields.verificationStatus)) {
                return res.status(400).json({ message: "Invalid verification status." });
            }
            if (fields.verificationStatus !== undefined && fields.verificationStatus !== "VERIFIED") {
                return res.status(400).json({ message: "Use PATCH /api/admin/medicines/:id/review to reject a donation or change its review state." });
            }

            const medicine = await Medicine.findById(req.params.id);
            if (!medicine) return res.status(404).json({ message: "Medicine not found" });
            if (fields.verificationStatus === "VERIFIED" && medicine.verificationStatus !== "PENDING") {
                return res.status(409).json({ message: "Donation has already been reviewed." });
            }

            if (req.user.role === "ADMIN") {
                if (fields.sourceId && !mongoose.isValidObjectId(fields.sourceId)) {
                    return res.status(400).json({ message: "sourceId must be a valid user ID." });
                }

                if (fields.sourceId !== undefined || fields.sourceType !== undefined) {
                    const sourceId = fields.sourceId ?? medicine.sourceId;
                    const sourceType = fields.sourceType ?? medicine.sourceType;
                    if (!mongoose.isValidObjectId(sourceId) || !["DONOR", "PHARMACY"].includes(sourceType)) {
                        return res.status(400).json({ message: "A valid sourceId and sourceType (DONOR or PHARMACY) are required." });
                    }
                    const source = await User.findOne({ _id: sourceId, role: sourceType });
                    if (!source) {
                        return res.status(400).json({ message: "sourceId must belong to an existing user with the selected sourceType." });
                    }
                }
            }
            if (!Object.keys(fields).length) {
                return res.status(400).json({ message: "No editable medicine fields were provided." });
            }

            if (fields.verificationStatus === "VERIFIED") {
                const session = await mongoose.startSession();
                let rewardResult;
                try {
                    await session.withTransaction(async () => {
                        const verifiedMedicine = await Medicine.findById(req.params.id).session(session);
                        if (!verifiedMedicine) {
                            const error = new Error("Medicine not found");
                            error.statusCode = 404;
                            throw error;
                        }
                        Object.assign(verifiedMedicine, fields);
                        await verifiedMedicine.save({ session });
                        rewardResult = await awardDonationReward(verifiedMedicine._id, { session });
                    });
                    const verifiedMedicine = await Medicine.findById(req.params.id);
                    return res.json({ medicine: verifiedMedicine, reward: rewardResult });
                } catch (error) {
                    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
                    if (error.code === 20 || error.codeName === "IllegalOperation" || /transaction numbers are only allowed|does not support transactions/i.test(error.message || "")) {
                        return res.status(503).json({ message: "Medicine verification rewards require MongoDB transactions; configure MongoDB as a replica set." });
                    }
                    if (error.name === "ValidationError" || error.name === "CastError") {
                        return res.status(400).json({ message: error.message });
                    }
                    console.error("VERIFY MEDICINE REWARD ERROR:", error);
                    return res.status(500).json({ message: "Server error" });
                } finally {
                    await session.endSession();
                }
            }

            Object.assign(medicine, fields);
            await medicine.save();
            return res.json({ medicine });
        } catch (error) {
            if (error.name === "ValidationError" || error.name === "CastError") {
                return res.status(400).json({ message: error.message });
            }
            console.error("UPDATE MEDICINE ERROR:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
);

router.delete(
    "/:id",
    authorizeRoles("ADMIN"),
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid medicine ID" });
        }
        try {
            const medicine = await Medicine.findById(req.params.id);
            if (!medicine) return res.status(404).json({ message: "Medicine not found" });
            await medicine.deleteOne();
            return res.status(200).json({ message: "Medicine deleted successfully" });
        } catch (error) {
            console.error("DELETE MEDICINE ERROR:", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
);

module.exports = router;
