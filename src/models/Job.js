const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobCategory: { type: String, enum: ["Local task", "Part-time job", "Full-time job"], required: true },
    title: { type: String, required: true },
    details: { type: String, required: true },
    workType: { type: String, required: true },
    budget: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },
    images: [{ type: String }],
    location: { type: String, required: true },
    preferredCommunication: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    expiresAt: { type: Date, default: () => Date.now() + 7 * 24 * 60 * 60 * 1000 },
    status: { type: String, default: "active" }
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);