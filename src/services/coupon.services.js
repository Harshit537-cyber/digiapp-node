const Coupon = require('../models/Coupon');
const User = require('../models/User');

exports.applyCouponService = async (userId, couponCode) => {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

    if (!coupon) throw new Error("Invalid or Expired Coupon Code");

    
    if (new Date() > coupon.expiryDate) throw new Error("Coupon has expired");

    
    if (coupon.usedBy.includes(userId)) throw new Error("You have already used this coupon");

   
    const user = await User.findById(userId);
    user.credits += coupon.credits;
    await user.save();

    
    coupon.usedBy.push(userId);
    await coupon.save();

    return { totalCredits: user.credits, addedCredits: coupon.credits };
};