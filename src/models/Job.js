const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobCategory: {
      type: String,
      enum: ["LOCAL_JOB", "PART_TIME_JOB", "FULL_TIME_JOB"],
      required: true,
    },


    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobsCategory",
      required: true,
    },

 subCategory: {
      type: String,
      required: true,
    },

    // Common Fields
    title: { type: String, required: true },
    details: { type: String, required: true },
    location: {
      type: {
        type: String,
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: {
        type: String,
      },
    },
    images: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "closed", "expired"],
      default: "active",
    },
    expiresAt: { type: Date, required: true },

    // Local Task Specific
    workType: { type: String },
    budget: {
      min: { type: Number },
      max: { type: Number },
    },
    preferredCommunication: [{ type: String }],

    // Job Specific (Part/Full time)
    companyName: { type: String },
    jobRole: { type: String },
    salaryRange: {
      min: { type: Number },
      max: { type: Number },
    },
    vacancies: { type: Number },
    whatsappNumber: { type: String },
    experience: { type: String },
    qualification: { type: String },
  },
  { timestamps: true },
);

jobSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Job", jobSchema);
