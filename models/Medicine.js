const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    genericName: String,

    category: String,

    quantity: {
        type: Number,
        required: true
    },

    unit: {
        type: String,
        default: "units"
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
        city: String,
        address: String
    },

    status: {
        type: String,
        enum: [
            "AVAILABLE",
            "REQUESTED",
            "ALLOCATED",
            "EXPIRED"
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
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Medicine", medicineSchema);