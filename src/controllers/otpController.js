const User = require("../models/User");
const Otp = require("../models/Otp");
const OtpService = require("../utils/msg91Service");
const jwt = require("jsonwebtoken");

const handleOtpSending = async (mobile) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  
  await Otp.findOneAndUpdate(
    { mobile }, 
    { otp, createdAt: Date.now() }, 
    { upsert: true, new: true }
  );

  await OtpService.sendOTP(mobile, otp);
  return true;
};

exports.requestOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile number is required" });

    await handleOtpSending(mobile);
    const user = await User.findOne({ mobile });

    res.status(200).json({
      success: true,
      isRegistered: !!user,
      message: "6-digit OTP sent successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile number is required" });

    await handleOtpSending(mobile);

    res.status(200).json({
      success: true,
      message: "OTP has been resent successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, message: "Details missing" });

    const otpRecord = await Otp.findOne({ mobile, otp });
    if (!otpRecord) return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    await Otp.deleteOne({ _id: otpRecord._id });
    
    const user = await User.findOne({ mobile });
    if (user) {
      
      const userResponse = user.toObject();
      delete userResponse.password; 

      return res.status(200).json({
        success: true,
        newUser: false,
        user: userResponse
      });

    } else {
      
      return res.status(200).json({
        success: true,
        newUser: true,
        message: "OTP Verified. Please proceed to registration."
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};