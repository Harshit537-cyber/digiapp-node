const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    
    password: {
      type: String,
      required: false
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true
    },

    // ---------------- LOCATION ----------------
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        // REQUIRED REMOVED: Now location is optional
      }
    },

    // human readable address (Separate top-level field)
    address: {
      type: String,
      trim: true
    },

    city: String,
    state: String,
    country: String,
    // ... (rest of the schema)
    // ---------------- PROFILE ----------------
    profilePhoto: String,

    role: {
      type: String,
      enum: [
        "SERVICE_PROVIDER",
        "BUSINESS_SHOPS",
        "JOB_SEEKER",
        "GENERAL_USER",
        "ADMIN"
      ],
      required: true
    },

    bloodGroup: String,

    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active"
    },

    credits: {
      type: Number,
      default: 0
    },
    token: {
      type: String,

    },


    fcmToken: {
      type: String,
      default: ""
    },

    isVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

UserSchema.index({ location: "2dsphere" });

module.exports = model("User", UserSchema);