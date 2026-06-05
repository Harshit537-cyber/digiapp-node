const razorpay = require("../config/razorpay");
const TransactionRecord = require("../models/Transaction");
const User = require("../models/User");
const Business = require("../models/Business");
const crypto = require("crypto"); 
const PlanConfig = require("../models/PlanConfig")
const mongoose = require("mongoose");


exports.createOrder = async (req, res) => {
  try {
    const { purpose, metadata , planId,businessId} = req.body; 

    
    const userId = req.user.userId; 

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "User ID missing in token payload. Please Login again." 
      });
    }


     const plan = await PlanConfig.findOne({ planId });
    if (!plan) {
      return res.status(404).json({ success: false, message: "Invalid Plan selected." });
    }
    const finalAmount = plan.price; 


    const options = {
      amount: finalAmount  * 100, 
      currency: "INR",
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    const newTransaction = new TransactionRecord({
      userId: userId, 
      orderId: order.id,
       businessId: businessId || null,
      amount: finalAmount,
      category: purpose === 'CREDIT' ? 'CREDIT_PURCHASE' : 'PLAN_UPGRADE', 
      metadata: metadata,
      status: 'Pending'
    });

    await newTransaction.save();

    res.json({ success: true, order });

  } catch (err) {
    console.error("Order Logic Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database Error: " + err.message 
    });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment Security Breach" });
    }

    const trx = await TransactionRecord.findOne({ orderId: razorpay_order_id });
    if (!trx) {
      return res.status(404).json({ success: false, message: "Transaction Record Not Found" });
    }

    
    if (trx.category === 'CREDIT_PURCHASE') {
      await User.findByIdAndUpdate(trx.userId, { 
         $inc: { credits: trx.metadata.creditsAdded } 
      });
    } 
    
    else if (trx.category === 'SUBSCRIPTION_UPGRADE') {
      const { planName, planType } = trx.metadata;
      
      let newBadge = (planName === "Pro+") ? "Trusted" : "Normal";
      
      let days = planType === "Monthly" ? 30 : 365;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + days);

      await Business.findOneAndUpdate(
        { userId: trx.userId },
        {
          badge: newBadge,
          "subscription.planName": planName,
          "subscription.planType": planType,
          "subscription.expiryDate": newExpiry,
          status: "Approved" 
        }
      );
    }
    trx.status = 'Success';
    trx.paymentId = razorpay_payment_id;
    await trx.save();

    res.json({ success: true, message: "DB Updated as per plan conditions" });

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTransactionHistory =  async (req, res) => {
  try {
    const tokenUserId = req.user.userId; 

    console.log("Fetching for User:", tokenUserId);

    const history = await TransactionRecord.find({ 
      userId: new mongoose.Types.ObjectId(tokenUserId) 
    }).sort({ createdAt: -1 });

    console.log("Total Found:", history.length);

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

exports.getUserCredits = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("credits fullName");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User nahi mila"
      });
    }

    res.status(200).json({
      success: true,
      fullName: user.fullName,
      credits: user.credits || 0 
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};