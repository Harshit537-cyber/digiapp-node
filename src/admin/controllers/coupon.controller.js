const Coupon = require('../../models/Coupon');

exports.createCoupon = async (req, res) => {
    try {
        const { code, credits, expiryDate, usageLimit } = req.body;

        
        const existing = await Coupon.findOne({ code });
        if (existing) return res.status(400).json({ message: "Coupon code already exists" });

        const newCoupon = await Coupon.create({
            code,
            credits,
            expiryDate,
            usageLimit
        });

        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: newCoupon
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};