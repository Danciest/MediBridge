const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 120
    },

    manufacturer: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 120
    },

    genericName: { type: String, trim: true, maxlength: 120 },

    category: { type: String, trim: true, maxlength: 80 },

    quantity: {
        type: Number,
        required: true,
        min: 1,
        max: 1000000,
        validate: { validator: Number.isSafeInteger, message: "Quantity must be a safe integer." }
    },

    unit: {
        type: String,
        default: "units"
    },

    batchNumber: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100
    },

    expiryDate: {
        type: Date,
        required: true
    },

    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    sourceType: {
        type: String,
        enum: ["DONOR", "PHARMACY"],
        required: true
    },

    location: {
        city: { type: String, trim: true, maxlength: 120 },
        address: { type: String, trim: true, maxlength: 250 }
    },

    status: {
        type: String,
        enum: [
            "AVAILABLE",
            "REQUESTED",
            "ALLOCATED",
            "EXPIRED",
            "CLAIMED"
        ],
        default: "AVAILABLE"
    },

    verificationStatus: {
        type: String,
        enum: [
            "PENDING",
            "VERIFIED",
            "REJECTED"
        ],
        default: "PENDING"
    },

    reviewReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Medicine", medicineSchema);
