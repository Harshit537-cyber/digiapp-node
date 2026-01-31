

// const { Schema, model } = require("mongoose");

// const UserSchema = new Schema(
//   {
//     mobile: { type: String, required: true },
//     fullName: { type: String, required: true },
//     gender: { type: String, enum: ["male", "female", "other"], required: true },

//     location: {
//       type: {
//         type: String,
//         enum: ["Point"],
//         default: "Point"
//       },
//       coordinates: {
//         type: [Number], // [longitude, latitude]
//         required: true
//       },
//       address: {
//         type: String
//       }
//     },

//     profilePhoto: { type: String },

//     role: {
//       type: String,
//       enum: ["SERVICE_PROVIDER", "BUSINESS_SHOPS", "JOB_SEEKER", "GENERAL_USER"],
//       required: true,
//     },

//     bloodGroup: { type: String, required: true },

//     status: {
//       type: String,
//       enum: ["Active", "Blocked"],
//       default: "Active"
//     },

//     credits: { type: Number, default: 0 },
//     isVerified: { type: Boolean, default: false }
//   },
//   { timestamps: true }
// );

// UserSchema.index({ location: "2dsphere" });

// module.exports = model("User", UserSchema);

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
        required: true
      }
    },

    // human readable address
    address: {
      type: String,
      trim: true
    },

    city: String,
    state: String,
    country: String,

    // ---------------- PROFILE ----------------
    profilePhoto: String,

    role: {
      type: String,
      enum: [
        "SERVICE_PROVIDER",
        "BUSINESS_SHOPS",
        "JOB_SEEKER",
        "GENERAL_USER"
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

    isVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

UserSchema.index({ location: "2dsphere" });

module.exports = model("User", UserSchema);
