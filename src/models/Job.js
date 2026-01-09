const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobCategory: { type: String, enum: ["Local task", "Part-time job", "Full-time job"], required: true },
    
    // Common Fields
    title: { type: String, required: true },
    details: { type: String, required: true },
    location: { type: String, required: true },
    images: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "closed", "expired"], default: "active" },
    expiresAt: { type: Date, required: true },

    // Local Task Specific
    workType: { type: String }, 
    budget: {
        min: { type: Number },
        max: { type: Number }
    },
    preferredCommunication: [{ type: String }],

    // Job Specific (Part/Full time)
    companyName: { type: String },
    jobRole: { type: String },
    salaryRange: {
        min: { type: Number },
        max: { type: Number }
    },
    vacancies: { type: Number },
    whatsappNumber: { type: String },
    experience: { type: String },
    qualification: { type: String },

}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);