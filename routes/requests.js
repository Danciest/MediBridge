const express = require("express");
const mongoose = require("mongoose");
const Request = require("../models/Request");
const Medicine = require("../models/Medicine");
const User = require("../models/User");
const { protect, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const requesterRoles = ["NGO", "HOSPITAL"];
const browseRoles = [...requesterRoles, "ADMIN"];
const urgencies = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statuses = ["PENDING", "MATCHED", "ACCEPTED", "FULFILLING", "COMPLETED", "CANCELLED"];
const descriptionLimit = 2000;
const requesterPopulation = { path: "requester", select: "name email role" };
const medicinePopulation = { path: "matchedMedicine", select: "name manufacturer quantity expiryDate status" };

router.use(protect);

function currentDateStart() {
    const parts = new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const dateParts = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return new Date(`${dateParts.year}-${dateParts.month}-${dateParts.day}T00:00:00.000Z`);
}

function userId(req) {
    return req.user.id || req.user._id || req.user.userId;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ownsRequest(request, req) {
    const requesterId = request.requester?._id || request.requester;
    return String(requesterId) === String(userId(req));
}

function mayManageRequest(request, req) {
    return req.user.role === "ADMIN" || ownsRequest(request, req);
}

function matchesMedicineName(medicineName) {
    return new RegExp(`^${escapeRegExp(medicineName.trim())}$`, "i");
}

function buildRequestFilters(query) {
    const filters = {};
    const medicineName = query.medicineName || query.search;
    if (medicineName !== undefined) {
        if (typeof medicineName !== "string" || !medicineName.trim()) {
            return { error: "Medicine name filter cannot be empty." };
        }
        filters.medicineName = new RegExp(escapeRegExp(medicineName.trim()), "i");
    }

    if (query.urgency !== undefined) {
        const urgency = String(query.urgency).toUpperCase();
        if (!urgencies.includes(urgency)) return { error: "Invalid urgency filter." };
        filters.urgency = urgency;
    }
    if (query.status !== undefined) {
        const status = String(query.status).toUpperCase();
        if (!statuses.includes(status)) return { error: "Invalid request status filter." };
        filters.status = status;
    }
    if (query.requesterRole !== undefined) {
        const role = String(query.requesterRole).toUpperCase();
        if (!requesterRoles.includes(role)) return { error: "Invalid requesterRole filter." };
        filters.requesterRole = role;
    }
    return { filters };
}

function sendRequestError(res, error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message: error.message });
    }
    console.error("REQUEST API ERROR:", error);
    return res.status(500).json({ message: "Server error" });
}

function isTransactionUnavailable(error) {
    return error.code === 20 || error.codeName === "IllegalOperation" ||
        /transaction numbers are only allowed|does not support transactions/i.test(error.message || "");
}

async function populateRequest(query) {
    return query.populate(requesterPopulation).populate(medicinePopulation);
}

router.post("/", authorizeRoles(...requesterRoles), async (req, res) => {
    try {
        const body = req.body || {};
        if (typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ message: "A JSON object is required." });
        const medicineName = typeof body.medicineName === "string" ? body.medicineName.trim() : "";
        if (!medicineName) return res.status(400).json({ message: "Medicine name is required" });

        if (body.quantity === undefined || body.quantity === null || body.quantity === "" ||
            !Number.isSafeInteger(Number(body.quantity)) || Number(body.quantity) <= 0 || Number(body.quantity) > 1000000) {
            return res.status(400).json({ message: "Quantity must be a whole number between 1 and 1000000." });
        }

        const urgency = typeof body.urgency === "string" ? body.urgency.toUpperCase() : "";
        if (!urgencies.includes(urgency)) {
            return res.status(400).json({ message: "Urgency must be LOW, MEDIUM, HIGH, or CRITICAL" });
        }
        if (body.description !== undefined && typeof body.description !== "string") {
            return res.status(400).json({ message: "Description must be a string" });
        }
        if (typeof body.description === "string" && body.description.length > descriptionLimit) {
            return res.status(400).json({ message: `Description cannot exceed ${descriptionLimit} characters` });
        }

        const requesterId = userId(req);
        if (!mongoose.isValidObjectId(requesterId)) {
            return res.status(401).json({ message: "Authenticated user ID is missing or invalid." });
        }
        const requester = await User.findOne({ _id: requesterId, role: req.user.role }).select("_id role");
        if (!requester) return res.status(401).json({ message: "Authenticated requester account was not found." });

        const request = await Request.create({
            requester: requester._id,
            requesterRole: requester.role,
            medicineName,
            quantity: Number(body.quantity),
            urgency,
            ...(body.description !== undefined ? { description: body.description.trim() } : {})
        });
        await request.populate(requesterPopulation);
        return res.status(201).json({ request });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

router.get("/my", authorizeRoles(...browseRoles), async (req, res) => {
    try {
        const parsed = buildRequestFilters(req.query);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        const filters = { ...parsed.filters };
        if (req.user.role !== "ADMIN") filters.requester = userId(req);
        const requests = await populateRequest(Request.find(filters).sort({ createdAt: -1 }));
        return res.json({ requests, count: requests.length });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

router.get("/pending", authorizeRoles(...browseRoles), async (req, res) => {
    try {
        const parsed = buildRequestFilters(req.query);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        const filters = { ...parsed.filters, status: "PENDING" };
        const requests = await populateRequest(Request.find(filters).sort({ createdAt: -1 }));
        return res.json({ requests, count: requests.length });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

router.get("/", authorizeRoles(...browseRoles), async (req, res) => {
    try {
        const parsed = buildRequestFilters(req.query);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        const filters = { ...parsed.filters };
        // Non-admin browsing is limited to the public matching queue. Client filters
        // cannot reveal another organization's accepted or private request history.
        if (req.user.role !== "ADMIN") {
            if (filters.status && filters.status !== "PENDING") {
                return res.json({ requests: [], count: 0 });
            }
            filters.status = "PENDING";
        }
        const requests = await populateRequest(Request.find(filters).sort({ createdAt: -1 }));
        return res.json({ requests, count: requests.length });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

router.get("/:id/matches", authorizeRoles(...browseRoles), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid request ID" });
    try {
        const request = await Request.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Request not found" });
        if (!mayManageRequest(request, req)) return res.status(403).json({ message: "Access denied" });

        const matches = await Medicine.find({
            name: matchesMedicineName(request.medicineName),
            quantity: { $gte: request.quantity },
            status: "AVAILABLE",
            expiryDate: { $gt: currentDateStart() }
        }).select("name manufacturer quantity batchNumber expiryDate location status")
            .sort({ expiryDate: 1, quantity: 1 });

        return res.json({
            request: {
                id: request._id,
                medicineName: request.medicineName,
                quantity: request.quantity
            },
            matches: matches.map(medicine => ({
                medicineId: medicine._id,
                name: medicine.name,
                manufacturer: medicine.manufacturer,
                quantity: medicine.quantity,
                expiryDate: medicine.expiryDate,
                location: medicine.location
            }))
        });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

router.post("/:id/accept", authorizeRoles(...browseRoles), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid request ID" });
    const { medicineId } = req.body || {};
    if (!mongoose.isValidObjectId(medicineId)) return res.status(400).json({ message: "A valid medicineId is required" });

    const session = await mongoose.startSession();
    let acceptedRequest;
    try {
        await session.withTransaction(async () => {
            const request = await Request.findById(req.params.id).session(session);
            if (!request) {
                const error = new Error("Request not found"); error.statusCode = 404; throw error;
            }
            if (!mayManageRequest(request, req)) {
                const error = new Error("Access denied"); error.statusCode = 403; throw error;
            }
            if (!["PENDING", "MATCHED"].includes(request.status)) {
                const error = new Error("Request cannot be accepted in its current status"); error.statusCode = 400; throw error;
            }

            const medicine = await Medicine.findById(medicineId).session(session);
            if (!medicine) {
                const error = new Error("Medicine not found"); error.statusCode = 404; throw error;
            }
            if (!matchesMedicineName(request.medicineName).test(medicine.name)) {
                const error = new Error("Medicine does not match the requested medicine"); error.statusCode = 400; throw error;
            }
            if (medicine.expiryDate <= currentDateStart()) {
                const error = new Error("Medicine has expired"); error.statusCode = 400; throw error;
            }
            if (medicine.status !== "AVAILABLE") {
                const error = new Error("Medicine is no longer available"); error.statusCode = 409; throw error;
            }
            if (medicine.quantity < request.quantity) {
                const error = new Error("Insufficient medicine quantity"); error.statusCode = 400; throw error;
            }

            const today = currentDateStart();
            const updatedMedicine = await Medicine.findOneAndUpdate({
                _id: medicine._id,
                status: "AVAILABLE",
                expiryDate: { $gt: today },
                quantity: { $gte: request.quantity }
            }, [{ $set: {
                quantity: { $subtract: ["$quantity", request.quantity] },
                status: {
                    $cond: [
                        { $eq: [{ $subtract: ["$quantity", request.quantity] }, 0] },
                        "CLAIMED",
                        "AVAILABLE"
                    ]
                }
            } }], { returnDocument: "after", updatePipeline: true, session });

            if (!updatedMedicine) {
                const error = new Error("Medicine is no longer available"); error.statusCode = 409; throw error;
            }

            acceptedRequest = await Request.findOneAndUpdate({
                _id: request._id,
                status: { $in: ["PENDING", "MATCHED"] }
            }, { $set: { status: "ACCEPTED", matchedMedicine: medicine._id } }, {
                returnDocument: "after",
                runValidators: true,
                session
            });
            if (!acceptedRequest) {
                const error = new Error("Request is no longer available for acceptance"); error.statusCode = 409; throw error;
            }
        });

        acceptedRequest = await populateRequest(Request.findById(acceptedRequest._id));
        return res.json({ request: acceptedRequest });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        if (isTransactionUnavailable(error)) {
            return res.status(503).json({ message: "Atomic acceptance requires MongoDB transactions; configure MongoDB as a replica set." });
        }
        return sendRequestError(res, error);
    } finally {
        await session.endSession();
    }
});

router.patch("/:id/status", authorizeRoles(...browseRoles), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid request ID" });
    const nextStatus = typeof req.body?.status === "string" ? req.body.status.toUpperCase() : "";
    if (!statuses.includes(nextStatus)) return res.status(400).json({ message: "Invalid request status" });
    try {
        const request = await Request.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Request not found" });
        if (!mayManageRequest(request, req)) return res.status(403).json({ message: "Access denied" });

        const transitions = { PENDING: ["MATCHED"], ACCEPTED: ["FULFILLING"] };
        if (!transitions[request.status]?.includes(nextStatus)) {
            return res.status(400).json({ message: "Invalid request status transition" });
        }
        if (nextStatus === "MATCHED") {
            const matchExists = await Medicine.exists({
                name: matchesMedicineName(request.medicineName),
                quantity: { $gte: request.quantity },
                status: "AVAILABLE",
                expiryDate: { $gt: currentDateStart() }
            });
            if (!matchExists) return res.status(400).json({ message: "No available medicine matches this request" });
        }

        const updated = await Request.findOneAndUpdate({ _id: request._id, status: request.status }, {
            $set: { status: nextStatus }
        }, { returnDocument: "after", runValidators: true });
        if (!updated) return res.status(400).json({ message: "Invalid request status transition" });
        await updated.populate(requesterPopulation);
        await updated.populate(medicinePopulation);
        return res.json({ request: updated });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

router.post("/:id/complete", authorizeRoles(...browseRoles), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid request ID" });
    try {
        const request = await Request.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Request not found" });
        if (!mayManageRequest(request, req)) return res.status(403).json({ message: "Access denied" });
        if (request.status !== "FULFILLING") {
            return res.status(400).json({ message: "Request must be FULFILLING before completion" });
        }
        const updated = await Request.findOneAndUpdate({ _id: request._id, status: "FULFILLING" }, {
            $set: { status: "COMPLETED" }
        }, { returnDocument: "after", runValidators: true });
        if (!updated) return res.status(400).json({ message: "Request cannot be completed in its current status" });
        await updated.populate(requesterPopulation);
        await updated.populate(medicinePopulation);
        return res.json({ request: updated });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

router.post("/:id/cancel", authorizeRoles(...browseRoles), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid request ID" });
    const session = await mongoose.startSession();
    let cancelledRequest;
    try {
        await session.withTransaction(async () => {
            const request = await Request.findById(req.params.id).session(session);
            if (!request) {
                const error = new Error("Request not found"); error.statusCode = 404; throw error;
            }
            if (!mayManageRequest(request, req)) {
                const error = new Error("Access denied"); error.statusCode = 403; throw error;
            }
            if (!["PENDING", "MATCHED", "ACCEPTED"].includes(request.status)) {
                const error = new Error(request.status === "COMPLETED" ? "Cannot cancel a completed request" : "Request cannot be cancelled in its current status");
                error.statusCode = 400; throw error;
            }

            if (request.status === "ACCEPTED" && request.matchedMedicine) {
                const today = currentDateStart();
                const medicine = await Medicine.findById(request.matchedMedicine).session(session);
                if (!medicine) {
                    const error = new Error("Medicine not found"); error.statusCode = 404; throw error;
                }
                const restored = await Medicine.findOneAndUpdate({ _id: medicine._id }, [{ $set: {
                    quantity: { $add: ["$quantity", request.quantity] },
                    status: { $cond: [{ $gt: ["$expiryDate", today] }, "AVAILABLE", "EXPIRED"] }
                } }], { returnDocument: "after", updatePipeline: true, session });
                if (!restored) {
                    const error = new Error("Medicine could not be restored"); error.statusCode = 409; throw error;
                }
            }

            cancelledRequest = await Request.findOneAndUpdate({
                _id: request._id,
                status: { $in: ["PENDING", "MATCHED", "ACCEPTED"] }
            }, { $set: { status: "CANCELLED" } }, {
                returnDocument: "after",
                runValidators: true,
                session
            });
            if (!cancelledRequest) {
                const error = new Error("Request cannot be cancelled in its current status"); error.statusCode = 400; throw error;
            }
        });
        cancelledRequest = await populateRequest(Request.findById(cancelledRequest._id));
        return res.json({ request: cancelledRequest });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        if (isTransactionUnavailable(error)) {
            return res.status(503).json({ message: "Atomic cancellation requires MongoDB transactions; configure MongoDB as a replica set." });
        }
        return sendRequestError(res, error);
    } finally {
        await session.endSession();
    }
});

router.get("/:id", authorizeRoles(...browseRoles), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid request ID" });
    try {
        const request = await populateRequest(Request.findById(req.params.id));
        if (!request) return res.status(404).json({ message: "Request not found" });
        if (!mayManageRequest(request, req)) return res.status(403).json({ message: "Access denied" });
        return res.json({ request });
    } catch (error) {
        return sendRequestError(res, error);
    }
});

module.exports = router;
