const express = require("express");
const router = express.Router();
const couponController = require("../controllers/coupon.controller");
const verifyAdmin = require("../admin/middlewares/adminAuth");
const verifyToken = require("../middlewares/auth.middlewares");


router.post("/redeem",verifyToken,couponController.redeemCouponUser);

router.post("/admin/create", verifyAdmin ,couponController.createCoupon);
router.get("/admin/all",  verifyAdmin , couponController.getAllCoupons);
router.get("/admin/track/:id", verifyAdmin , couponController.getCouponTracker);
router.get("/available", verifyToken, couponController.getAvailableCoupons)

module.exports = router;