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
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Details missing" });
    }

    const otpRecord = await Otp.findOne({ mobile, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    await Otp.deleteOne({ _id: otpRecord._id });
    
    const user = await User.findOne({ mobile });

    if (user) {
      const token = jwt.sign(
        { userId: user._id }, 
        process.env.JWT_SECRET , 
        { expiresIn: "30d" } 
      );

      const userResponse = user.toObject();
      delete userResponse.password;
       delete userResponse.token;

      return res.status(200).json({
        success: true,
        newUser: false,
        message: "Login successful",
        token: token, 
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




const handleAdminOtpSending = async (mobile) => {
  const adminUser = await User.findOne({ mobile, role: "ADMIN" });
  
  if (!adminUser) {
    throw new Error("Access Denied: Mobile number not registered as Admin.");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  
  await Otp.findOneAndUpdate(
    { mobile }, 
    { otp, createdAt: new Date() }, 
    { upsert: true, new: true }
  );

  await OtpService.sendOTP(mobile, otp);
  return true;
};

exports.requestAdminOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

    await handleAdminOtpSending(mobile);

    res.status(200).json({
      success: true,
      message: "Admin OTP sent successfully"
    });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.resendAdminOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

    await handleAdminOtpSending(mobile);

    res.status(200).json({
      success: true,
      message: "OTP has been resent to Admin"
    });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
};

exports.verifyAdminOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
    }

    const otpRecord = await Otp.findOne({ mobile, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const otpAge = (new Date() - otpRecord.createdAt) / 1000 / 60; 
    if (otpAge > 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    const user = await User.findOne({ mobile, role: "ADMIN" });
    if (!user) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    await Otp.deleteOne({ _id: otpRecord._id });
    
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "30d" } 
    );

    const adminData = user.toObject();
    delete adminData.password;
    delete adminData.fcmToken;
    if(adminData.token) delete adminData.token; 

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token: token, 
      user: adminData
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

