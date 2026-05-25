const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String },
  amount: { type: Number, required: true },
  category: { 
    type: String, 
    enum: ['CREDIT_PURCHASE', 'PLAN_UPGRADE', 'COUPON_REDEEM'], 
    required: true 
  },
  status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
  metadata: {
    creditsAdded: Number,
    planName: String,
    planDuration: String,
    couponCode: String
  }
}, { timestamps: true });

module.exports = mongoose.model("TransactionRecord", transactionSchema);