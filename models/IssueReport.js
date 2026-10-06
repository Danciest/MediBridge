const mongoose = require("mongoose");

const issueReportSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["USER", "MEDICINE", "REQUEST", "OTHER"], required: true, index: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    relatedMedicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", default: null },
    relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: "Request", default: null },
    status: { type: String, enum: ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"], default: "OPEN", index: true },
    adminNotes: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true });

issueReportSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model("IssueReport", issueReportSchema);
