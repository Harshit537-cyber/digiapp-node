const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum:["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    urgency: {
      type: String,
      required: true,
      enum:["Normal", "Urgent", "Critical"],
    },
    hospitalName: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
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
    contactNumber: {
      type: String,
      required: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
    },
    additionalInfo: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Deactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

bloodRequestSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);