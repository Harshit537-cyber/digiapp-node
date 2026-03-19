const Coupon = require('../models/Coupon');
const User = require('../models/User');

exports.applyCouponService = async (userId, couponCode) => {
    const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(), 
        isActive: true 
    });

    if (!coupon) {
        throw new Error("Invalid or Expired Coupon Code");
    }

    if (new Date() > coupon.expiryDate) {
        throw new Error("This coupon has expired");
    }

    if (coupon.usedBy.length >= coupon.usageLimit) {
        throw new Error("Coupon usage limit reached");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User record not found in database");
    }

    const isAlreadyUsed = coupon.usedBy.some(record => record.user.equals(userId));
    if (isAlreadyUsed) {
        throw new Error("You have already used this coupon");
    }

    user.credits = (user.credits || 0) + coupon.credits;
    
    coupon.usedBy.push({ 
        user: userId, 
        usedAt: new Date() 
    });

    await Promise.all([user.save(), coupon.save()]);

    return { 
        totalCredits: user.credits, 
        addedCredits: coupon.credits 
    };
};