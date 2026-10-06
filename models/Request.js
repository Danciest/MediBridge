const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    requesterRole: {
        type: String,
        enum: ["NGO", "HOSPITAL"],
        required: true
    },
    medicineName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 120
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity must be at least one."],
        max: [1000000, "Quantity cannot exceed 1000000."],
        validate: { validator: Number.isSafeInteger, message: "Quantity must be a safe integer." }
    },
    urgency: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, "Description cannot exceed 2000 characters."]
    },
    status: {
        type: String,
        enum: ["PENDING", "MATCHED", "ACCEPTED", "FULFILLING", "COMPLETED", "CANCELLED"],
        default: "PENDING",
        index: true
    },
    matchedMedicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Medicine",
        default: null
    }
}, { timestamps: true });

requestSchema.index({ status: 1, urgency: -1, createdAt: -1 });

module.exports = mongoose.model("Request", requestSchema);
