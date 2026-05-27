exports.upgradeBusinessPlan = async (req, res) => {
  // 1. Start Mongoose Session for Data Integrity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { businessId, planName, planType, amount, paymentDetails } = req.body;

    const userId = req.user.userId || req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User authentication failed. No ID found." });
    }

    const business = await Business.findOne({ _id: businessId, userId }).session(session);
    if (!business) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Business not found or access denied." });
    }

    let newExpiryDate = new Date();
    
    if (planType === "Monthly") {
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    } else if (planType === "Yearly") {
      newExpiryDate.setDate(newExpiryDate.getDate() + 365);
    }


    const finalBadge = (planName === "Pro+") ? "Trusted" : "Normal";

    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      {
        badge: finalBadge,
        "subscription.planName": planName,
        "subscription.planType": planType,
        "subscription.expiryDate": newExpiryDate,
        "subscription.isTrialUsed": true,
        status: "Approved" 
      },
      { new: true, session }
    );

    await TransactionRecord.create([{
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
    }], { session });

    await session.commitTransaction();
    session.endSession();

    console.log(`✅ Shop Upgrade Success: ${business.businessName} is now ${planName}`);

    return res.status(200).json({
      success: true,
      message: `Shop successfully upgraded to ${planName}!`,
      data: updatedBusiness,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error("❌ Plan Upgrade Critical Error:", error);
    return res.status(500).json({
      success: false,
      message: "Plan upgrade failed due to server error",
      error: error.message,
    });
  }
};

exports.processExpiredSubscriptions = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const today = new Date();
        const report = {
            processedCount: 0,
            downgradedBusinesses: [],
            errors: []
        };

        const expiredBusinesses = await Business.find({
            "subscription.expiryDate": { $lt: today },
            "subscription.planName": { $ne: "Free" }
        }).session(session);

        if (!expiredBusinesses || expiredBusinesses.length === 0) {
            await session.abortTransaction();
            return res.status(200).json({ 
                success: true, 
                message: "No expired subscriptions found today." 
            });
        }

        for (const business of expiredBusinesses) {
            try {
                const oldPlan = business.subscription.planName;
                
                const updatedDoc = await Business.findByIdAndUpdate(
                    business._id,
                    {
                        badge: "Normal", 
                        "subscription.planName": "Free",
                        "subscription.planType": "None",
                        "subscription.expiryDate": null,
                   
                   
                    },
                    { new: true, session }
                );

                await TransactionRecord.create([{
                    userId: business.userId,
                    businessId: business._id,
                    amount: 0,
                    category: 'PLAN_EXPIRED',
                    status: 'Success',
                    metadata: {
                        previousPlan: oldPlan,
                        expiryDate: business.subscription.expiryDate,
                        action: "Auto-Downgrade due to expiration"
                    }
                }], { session });

                report.downgradedBusinesses.push({
                    id: business._id,
                    name: business.businessName,
                    previousPlan: oldPlan
                });
                report.processedCount++;

                console.log(`📉 Downgraded: ${business.businessName} (Expired on ${business.subscription.expiryDate})`);

            } catch (err) {
                report.errors.push({
                    businessId: business._id,
                    error: err.message
                });
            }
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: `Processed ${report.processedCount} expired subscriptions.`,
            summary: report
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        console.error("❌ Expiry Processing Error:", error);
        return res.status(500).json({
            success: false,
            message: "Critical error during subscription processing",
            error: error.message
        });
    }
};