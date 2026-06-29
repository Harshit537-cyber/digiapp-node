const mongoose = require("mongoose");

const unlockSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "onModel", 
    },
    onModel: {
      type: String,
      required: true,
      enum: ["Job", "Item", "Business"],
    },
    unlockCost: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

unlockSchema.index({ userId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("Unlock", unlockSchema);