const Coupon = require('../models/Coupon');


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

exports.redeemCouponUser = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.user.id; // From Auth Middleware

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

        // 1. Validations
        if (!coupon) return res.status(404).json({ message: "Invalid Coupon Code" });
        if (new Date() > coupon.expiryDate) return res.status(400).json({ message: "Coupon Expired" });
        if (coupon.usedBy.length >= coupon.usageLimit) return res.status(400).json({ message: "Coupon Limit Reached" });
        
        const alreadyUsed = coupon.usedBy.some(u => u.user.toString() === userId);
        if (alreadyUsed) return res.status(400).json({ message: "You have already used this coupon" });

        // 2. Transaction (User Credits update + Coupon UsedBy push + Transaction Record)
        // Production tip: Use Mongoose Session for Atomicity
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Update User Credits
            await User.findByIdAndUpdate(userId, { $inc: { credits: coupon.credits } }, { session });

            // Mark Coupon as Used
            coupon.usedBy.push({ user: userId });
            await coupon.save({ session });

            // Create Success Transaction
            await Transaction.create([{
                userId,
                amount: 0, // Coupon is free
                category: 'COUPON_REDEEM',
                status: 'Success',
                metadata: { creditsAdded: coupon.credits, couponCode: coupon.code }
            }], { session });

            await session.commitTransaction();
            res.status(200).json({ success: true, message: `${coupon.credits} credits added to your wallet!` });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCoupon = async (req, res) => {
    try {

        const { id } = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully",
            data: deletedCoupon
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

exports.updateCouponStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { isActive } = req.body;

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            { isActive },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedCoupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        res.status(200).json({
            success: true,
            message: `Coupon ${
                isActive ? "activated" : "deactivated"
            } successfully`,
            data: updatedCoupon
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};