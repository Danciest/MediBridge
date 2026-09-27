const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({

    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Medicine",
        required: true
    },

    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    requesterType: {
        type: String,
        enum: ["NGO", "HOSPITAL"],
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    purpose: String,

    status: {
        type: String,
        enum: [
            "PENDING",
            "APPROVED",
            "REJECTED",
            "FULFILLED"
        ],
        default: "PENDING"
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    reviewedAt: Date

}, {
    timestamps: true
});

module.exports = mongoose.model("Request", requestSchema);