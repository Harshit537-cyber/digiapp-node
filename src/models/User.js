const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    mobile: { type: String, required: true }, 
    fullName: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    location: { type: String, required: true },
    profilePhoto: { type: String },
    role: {
      type: String,
      enum: ["SERVICE_PROVIDER", "BUSINESS_SHOPS", "JOB_SEEKER", "GENERAL_USER"],
      required: true,
    },
    bloodGroup: { type: String, required: true },
    
    
    status: { 
      type: String, 
      enum: ["Active", "Blocked"], 
      default: "Active" 
    },
    credits: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = model("User", UserSchema);