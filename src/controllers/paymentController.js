const razorpay = require("../config/razorpay");
const Transaction = require("../models/Transaction")



exports.createOrder = async (req, res) => {
  const { amount, purpose, metadata } = req.body; 

  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `rcpt_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    await Transaction.create({
      userId: req.user.id,
      orderId: order.id,
      amount: amount,
      category: purpose === 'CREDIT' ? 'CREDIT_PURCHASE' : 'SUBSCRIPTION_UPGRADE',
      metadata: metadata,
      status: 'Pending'
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest("hex");

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Payment Security Breach" });
  }

  const trx = await Transaction.findOne({ orderId: razorpay_order_id });

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

  // Transaction ko Success mark karo
  trx.status = 'Success';
  trx.paymentId = razorpay_payment_id;
  await trx.save();

  res.json({ success: true, message: "DB Updated as per plan conditions" });
};


exports.getTransactionHistory = async (req, res) => {
    try {
        const history = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};