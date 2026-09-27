const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
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

    phone: String,

    address: String,

    city: String,

    isVerified: {
        type: Boolean,
        default: false
    },

    rewardPoints: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);