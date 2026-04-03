const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["CREDIT", "DEBIT"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    enum: [
      "SIGNUP_BONUS",
      "POST_JOB",
      "APPLY_JOB",
      "FEATURE_POST",
      "MARKETPLACE_POST",
      "ADMIN_ADD",
      "ADMIN_DEDUCT",
      "COUPON",
      'POST_FEATURED_JOB'
    ],
  },
  balanceAfter: {
    type: Number,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId, // jobId / listingId etc
  }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);