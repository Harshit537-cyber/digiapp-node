const Coupon = require('../../models/Coupon');


exports.createCoupon = async (req, res) => {
    try {
        const { code, credits, expiryDate, usageLimit } = req.body;
        const existing = await Coupon.findOne({ code });
        if (existing) return res.status(400).json({ message: "Coupon code already exists" });

        const newCoupon = await Coupon.create({ code, credits, expiryDate, usageLimit });
        res.status(201).json({ success: true, message: "Coupon created", data: newCoupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getAllCoupons = async (req, res) => {
    try {
        
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        
        const data = coupons.map(c => ({
            id: c._id,
            code: c.code,
            credits: c.credits,
            expiry: c.expiryDate,
            totalUsed: c.usedBy.length, 
            limit: c.usageLimit,
            status: c.isActive
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getCouponTracker = async (req, res) => {
    try {
        const { id } = req.params; 

        
        const coupon = await Coupon.findById(id)
            .populate({
                path: 'usedBy.user',
                select: 'name mobile profilePhoto' 
            });

        if (!coupon) return res.status(404).json({ message: "Coupon not found" });

        res.status(200).json({
            success: true,
            couponInfo: {
                code: coupon.code,
                creditsGiven: coupon.credits,
                totalRedemptions: coupon.usedBy.length
            },
            usageHistory: coupon.usedBy.map(history => ({
                userName: history.user ? history.user.name : "Unknown User",
                userMobile: history.user ? history.user.mobile : "N/A",
                redeemedAt: history.usedAt 
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};