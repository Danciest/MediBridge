const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ["EARN", "REDEEM", "ADMIN_ADJUSTMENT"],
        required: true
    },
    // EARN values are positive, REDEEM values are negative, and ADMIN_ADJUSTMENT
    // may be positive or negative. balanceAfter is always non-negative.
    points: {
        type: Number,
        required: true,
        validate: {
            validator(value) {
                if (!Number.isSafeInteger(value)) return false;
                if (this.type === "EARN") return value > 0;
                if (this.type === "REDEEM") return value < 0;
                return value !== 0;
            },
            message: "Points must be an integer with a valid sign for this transaction type."
        }
    },
    balanceAfter: {
        type: Number,
        required: true,
        min: [0, "Reward balance cannot be negative."],
        validate: { validator: Number.isSafeInteger, message: "Reward balance must be an integer." }
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 500
    },
    medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Medicine",
        default: null,
        required: function requireMedicineForDonationEarn() {
            return this.type === "EARN";
        }
    },
    idempotencyKey: {
        type: String,
        trim: true,
        maxlength: 128,
        required: function requireRedemptionIdempotencyKey() {
            return this.type === "REDEEM";
        }
    },
    status: {
        type: String,
        enum: ["PENDING", "COMPLETED", "CANCELLED"],
        default: "COMPLETED"
    }
}, { timestamps: true });

rewardSchema.index(
    { medicine: 1, type: 1 },
    { unique: true, partialFilterExpression: { type: "EARN" } }
);
rewardSchema.index({ user: 1, createdAt: -1 });
rewardSchema.index(
    { user: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { type: "REDEEM", idempotencyKey: { $type: "string" } } }
);

module.exports = mongoose.model("Reward", rewardSchema);
