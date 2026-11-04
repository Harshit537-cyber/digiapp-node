const razorpay = require("../config/razorpay");
const TransactionRecord = require("../models/Transaction");
const User = require("../models/User");
const Business = require("../models/Business");
const crypto = require("crypto");
const PlanConfig = require("../models/PlanConfig");
const mongoose = require("mongoose");

// Helper for Razorpay network calls with timeout and retry
const callWithRetryAndTimeout = async (fn, maxRetries = 1, timeoutMs = 15000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("GATEWAY_TIMEOUT")), timeoutMs)
        )
      ]);
      return result;
    } catch (err) {
      const isTimeout = err.message === "GATEWAY_TIMEOUT" || 
                        err.code === "ETIMEDOUT" || 
                        err.code === "ESOCKETTIMEDOUT" || 
                        err.code === "ECONNRESET";
      if (attempt < maxRetries && isTimeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw err;
    }
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { planId, businessId } = req.body; 
    const userId = req.user.userId; 

    const plan = await PlanConfig.findOne({ planId });
    if (!plan) {
      return res.status(404).json({ success: false, message: "Invalid Plan selected." });
    }

    if (plan.category === 'SUBSCRIPTION') {
      if (!businessId) {
        return res.status(400).json({ success: false, message: "Business ID is required for this plan." });
      }

      const business = await Business.findOne({ _id: businessId, userId: userId });
      
      if (!business) {
        return res.status(403).json({ 
          success: false, 
          message: "Unauthorized! This business does not belong to your account." 
        });
      }
    }

    const options = {
      amount: plan.price * 100, 
      currency: "INR",
      receipt: `rcpt_${Date.now()}`
    };

    const order = await callWithRetryAndTimeout(
      () => razorpay.orders.create(options),
      1,
      15000
    );

    // 4. Transaction Record
    const newTransaction = new TransactionRecord({
      userId: userId,
      orderId: order.id,
      businessId: plan.category === 'SUBSCRIPTION' ? businessId : null,
      amount: plan.price,
      category: plan.category === 'CREDIT' ? 'CREDIT_PURCHASE' : 'PLAN_UPGRADE',
      metadata: {
        planConfigId: plan._id, 
        planName: plan.name,    
        planType: plan.duration, 
        creditsToBanner: plan.credits,
        planId: plan.planId
      },
      status: 'Pending'
    });

    await newTransaction.save();
    res.json({ success: true, order });

  } catch (err) {
    console.error("Order Error:", err);
    if (err.message === "GATEWAY_TIMEOUT" || err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
      return res.status(504).json({
        success: false,
        status: "Timeout",
        message: "Payment gateway connection timed out. Please try again."
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Order ID, Payment ID, and Signature are required."
      });
    }

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment Security Breach" });
    }

    const trx = await TransactionRecord.findOne({ orderId: razorpay_order_id });
    if (!trx) return res.status(404).json({ success: false, message: "Transaction Record Not Found" });

    // Idempotency: Prevent duplicate execution if already verified
    if (trx.status === "Success") {
      return res.status(200).json({
        success: true,
        status: "Success",
        message: "Payment already verified and processed.",
        alreadyProcessed: true
      });
    }

    // Verify final transaction status with Razorpay
    let paymentDetails;
    try {
      paymentDetails = await callWithRetryAndTimeout(
        () => razorpay.payments.fetch(razorpay_payment_id),
        1,
        15000
      );
    } catch (fetchErr) {
      console.error("Razorpay Payment Fetch Error:", fetchErr);
      if (fetchErr.message === "GATEWAY_TIMEOUT" || fetchErr.code === "ETIMEDOUT") {
        return res.status(504).json({
          success: false,
          status: "Timeout",
          message: "Payment status check timed out. Please try verifying again in a moment."
        });
      }
      return res.status(502).json({
        success: false,
        status: "Error",
        message: "Unable to verify transaction with payment gateway: " + fetchErr.message
      });
    }

    if (!paymentDetails) {
      return res.status(400).json({
        success: false,
        status: "Failed",
        message: "Payment details could not be retrieved from gateway."
      });
    }

    // Handle failed payment status
    if (paymentDetails.status === "failed") {
      trx.status = "Failed";
      trx.paymentId = razorpay_payment_id;
      await trx.save();
      return res.status(400).json({
        success: false,
        status: "Failed",
        message: paymentDetails.error_description || "Payment failed at bank / gateway."
      });
    }

    // Handle pending / processing status
    if (paymentDetails.status !== "captured" && paymentDetails.status !== "authorized") {
      trx.status = "Pending";
      trx.paymentId = razorpay_payment_id;
      await trx.save();
      return res.status(202).json({
        success: false,
        status: "Pending",
        message: "Payment is currently pending or processing with the bank. Please check back shortly."
      });
    }

    // Payment is captured / authorized -> proceed with exact fulfillment logic
    if (trx.category === 'CREDIT_PURCHASE') {
      await User.findByIdAndUpdate(trx.userId, {
        $inc: { credits: trx.metadata.creditsToBanner }
      });
    }

    else if (trx.category === 'PLAN_UPGRADE') {
      const { planName, planType } = trx.metadata;

      let newBadges = ["Verified"];
      if (planName === "Pro+") {
        newBadges = ["Verified", "Trusted"];
      }

      let newExpiry = new Date();
      if (planType === "MONTHLY") {
        newExpiry.setMonth(newExpiry.getMonth() + 1);
      } else if (planType === "YEARLY") {
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      }

      await Business.findOneAndUpdate(
        { _id: trx.businessId }, 
        {
          $set: {
            "subscription.planName": planName,
            "subscription.planType": planType === "MONTHLY" ? "Monthly" : "Yearly",
            "subscription.expiryDate": newExpiry,
            "badge": newBadges
          },
          $pull: { status: { $in: ["Expired", "Pending"] } }, 
          $addToSet: { status: { $each: ["Approved", "Active"] } }
        }
      );
    }

    trx.status = 'Success';
    trx.paymentId = razorpay_payment_id;
    await trx.save();

    res.json({ success: true, status: "Success", message: "Payment Verified and Shop Activated Successfully!" });

  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTransactionHistory = async (req, res) => {
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
        message: "User Not found"
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