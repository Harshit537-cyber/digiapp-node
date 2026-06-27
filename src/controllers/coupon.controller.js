const Coupon = require('../models/Coupon');
const TransactionRecord = require("../models/Transaction");
const User = require("../models/User");


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


exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params; 
        const { code, credits, expiryDate, usageLimit } = req.body;

        let coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        if (code && code !== coupon.code) {
            const existingCode = await Coupon.findOne({ code });
            if (existingCode) {
                return res.status(400).json({ success: false, message: "New coupon code already exists" });
            }
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            { code, credits, expiryDate, usageLimit },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            data: updatedCoupon
        });

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
            deletedData: deletedCoupon 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Error deleting coupon: " + error.message 
        });
    }
};

exports.getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        
        let coupon = await Coupon.findById(id).lean();

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        if (coupon.usedBy && coupon.usedBy.length > 0) {
            coupon.usedBy = coupon.usedBy.map(item => {
                return {

                    userId: item._id.toString(), 
                    usedAt: item.usedAt
                };
            });
        }

        res.status(200).json({
            success: true,
            data: coupon
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Server error: " + error.message 
        });
    }
};


exports.searchCoupons = async (req, res) => {
    try {
        const { 
            q,          
            status,     
            sort,       
            page = 1,   
            limit = 10 
        } = req.query;

        let query = {};

        if (q) {
            query.code = { $regex: q, $options: 'i' };
        }

        const now = new Date();
        if (status === 'active') {
            query.expiryDate = { $gte: now }; 
        } else if (status === 'expired') {
            query.expiryDate = { $lt: now }; 
        }

        let sortOption = { createdAt: -1 }; 
        if (sort === 'high-credits') sortOption = { credits: -1 };
        if (sort === 'low-credits') sortOption = { credits: 1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };

        const skip = (page - 1) * limit;

        const coupons = await Coupon.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(); 

        const total = await Coupon.countDocuments(query);

        const cleanedCoupons = coupons.map(coupon => {
            if (coupon.usedBy && Array.isArray(coupon.usedBy)) {
                coupon.usedBy = coupon.usedBy.map(u => ({
                    userId: u._id ? u._id.toString() : null, 
                    usedAt: u.usedAt
                }));
            }
            return coupon;
        });

        res.status(200).json({
            success: true,
            totalFound: total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            data: cleanedCoupons 
        });

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

      
        const userId = req.user.userId || req.user.id || req.user._id; 

        if (!userId) {
            return res.status(401).json({ success: false, message: "User ID not found in token" });
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

        if (!coupon) return res.status(404).json({ message: "Invalid Coupon Code" });
        if (new Date() > coupon.expiryDate) return res.status(400).json({ message: "Coupon Expired" });
        if (coupon.usedBy.length >= coupon.usageLimit) return res.status(400).json({ message: "Coupon Limit Reached" });
        
        const alreadyUsed = coupon.usedBy.some(u => u.user.toString() === userId.toString());
        if (alreadyUsed) return res.status(400).json({ message: "You have already used this coupon" });

        const mongoose = require("mongoose"); 
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await User.findByIdAndUpdate(userId, { $inc: { credits: coupon.credits } }, { session });

            coupon.usedBy.push({ user: userId });
            await coupon.save({ session });


              const customOrderId = `REDEEM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const TransactionModel = mongoose.models.TransactionRecord || mongoose.models.Transaction;

            await TransactionModel.create([{
                userId,
                amount: 0,
                   orderId: customOrderId,
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
        console.error("Redeem Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getAvailableCoupons = async (req, res) => {
  try {
    const today = new Date();
    
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gt: today }
    }).sort({ createdAt: -1 });

    const availableCoupons = coupons.filter(coupon => {
      const isLimitAvailable = coupon.usedBy.length < coupon.usageLimit;
      
      const isAlreadyUsedByUser = coupon.usedBy.some(u => {
          if (u.user && userId) {
              return u.user.toString() === userId.toString();
          }
          return false;
      });

      return isLimitAvailable && !isAlreadyUsedByUser;
    });

    const data = availableCoupons.map(c => ({
      id: c._id,
      code: c.code,
      credits: c.credits,
      expiry: c.expiryDate,
      message: `Redeem this code to get ${c.credits} Credits!`
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error("Get Coupons Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.activateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByIdAndUpdate(
            id, 
            { isActive: true }, 
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deactivateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByIdAndUpdate(
            id, 
            { isActive: false }, 
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};