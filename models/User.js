const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: [
            "DONOR",
            "PHARMACY",
            "NGO",
            "HOSPITAL",
            "ADMIN"
        ],
        required: true
    },

    phone: { type: String, trim: true, maxlength: 40 },

    address: { type: String, trim: true, maxlength: 250 },

    city: { type: String, trim: true, maxlength: 120 },

    isVerified: {
        type: Boolean,
        default: false
    },

    active: {
        type: Boolean,
        default: true,
        index: true
    },

    rewardPoints: {
        type: Number,
        default: 0,
        min: [0, "Reward points cannot be negative."],
        max: Number.MAX_SAFE_INTEGER,
        validate: { validator: Number.isSafeInteger, message: "Reward points must be a safe integer." }
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
