const express = require("express");
const router = express.Router();
const authController = require("../controllers/otpController");
const rateLimit = require("express-rate-limit");


const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    success: false,
    message: "Too many attempts from this IP, please try again after 15 minutes"
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

router.post("/request-otp",  authController.requestOtp);

router.post("/resend-otp",  authController.resendOtp);

router.post("/verify-otp", authController.verifyOtp);

router.post("/admin/send-otp", authController.requestAdminOtp);

router.post("/admin/verify-otp", authController.verifyAdminOtp);

router.post("/admin/resend-otp", authController.resendAdminOtp);   
module.exports = router;