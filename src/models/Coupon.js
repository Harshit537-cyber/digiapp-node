const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    credits: { type: Number, required: true }, 
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 1 }, 
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
