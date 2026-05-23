const Business = require("../models/Business");
const Transaction = require("../models/Transaction");

exports.upgradeBusinessPlan = async (req, res) => {
  try {
    const { businessId, planName, planType, amount, paymentDetails } = req.body;
    const userId = req.user.id; 

    // 1. Check if business exists and belongs to this user
    const business = await Business.findOne({ _id: businessId, userId });
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }


    let newExpiryDate = new Date();
    if (planType === "Monthly") {
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    } else if (planType === "Yearly") {
      newExpiryDate.setDate(newExpiryDate.getDate() + 365);
    }

    let finalBadge = (planName === "Pro+") ? "Trusted" : "Normal";


    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      {
        badge: finalBadge,
        "subscription.planName": planName,
        "subscription.planType": planType,
        "subscription.expiryDate": newExpiryDate,
        "subscription.isTrialUsed": true, 
      },
      { new: true }
    );

    await Transaction.create({
      userId,
      businessId,
      amount,
      category: 'PLAN_UPGRADE',
      status: 'Success',
      orderId: paymentDetails.orderId,
      paymentId: paymentDetails.paymentId,
      metadata: {
        planName,
        planDuration: planType
      }
    });

    return res.status(200).json({
      success: true,
      message: `Plan upgraded to ${planName} successfully!`,
      data: updatedBusiness,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Plan upgrade failed",
      error: error.message,
    });
  }
};