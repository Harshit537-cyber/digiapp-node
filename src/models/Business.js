const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  serviceTitle: {
    type: String,
    required: true,
  },
  serviceDetails: {
    type: String,
    required: true,
  },
  serviceImages: [{ type: String }],
});

const businessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Text Fields
    businessName: { type: String, required: true },
    details: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessCategory',
      required: true
    },

    subCategory: {
      type: String,
      required: true
    },
    // location: { type: String, required: true },
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
    // address: { type: String, required: true },

    // Owner Details
    ownerName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    whatsappNumber: { type: String, required: true },

    // Image URLs (Cloudinary)
    businessImages: [{ type: String, required: true }],
    nationalIdImage: { type: String, required: true },
    ownerImage: { type: String, required: true },

    isBlocked: {
      type: Boolean,
      default: false,
    },


    subscription: {
      planName: { type: String, enum: ["None", "Lite", "Pro+", "Trial"], default: "Trial" },
      planType: { type: String, enum: ["Monthly", "Yearly", "Trial", "None"], default: "Trial" },
      expiryDate: { type: Date },
      isTrialUsed: { type: Boolean, default: false }
    },

    // Admin Verification Flow
    status: {
      type: [String],
      enum: ["Pending", "Approved", "Rejected","Expired", "Active"],
      default: "Pending",
      required: true,
    },


    badge: {
      type: [String],
      enum: ["None", "Verified", "Trusted", "Trial"],
      default: "Trial",
    },
    backgroundImage: {
      type: String,
      default: "",
    },
    services: [serviceSchema],
  },
  { timestamps: true },
);

businessSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Business", businessSchema);
