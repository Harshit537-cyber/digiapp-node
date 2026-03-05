const Coupon = require('../models/Coupon');
const User = require('../models/User');

exports.applyCouponService = async (userId, couponCode) => {
    // 1. Coupon check
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) throw new Error("Invalid or Expired Coupon Code");

    // 2. User check
    const user = await User.findById(userId);
    if (!user) throw new Error("User record not found in database");

    // 3. Already used check
    if (coupon.usedBy.includes(userId)) throw new Error("You have already used this coupon");

    // 4. Update Credits (Safe handling if credits is undefined)
    user.credits = (user.credits || 0) + coupon.credits;
    await user.save();

    // 5. Mark as used
    coupon.usedBy.push(userId);
    await coupon.save();

    return { totalCredits: user.credits, addedCredits: coupon.credits };
};