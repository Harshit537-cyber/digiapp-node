const mongoose = require("mongoose");

const jobUnlockSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
  },
  { timestamps: true }
);

jobUnlockSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("JobUnlock", jobUnlockSchema);